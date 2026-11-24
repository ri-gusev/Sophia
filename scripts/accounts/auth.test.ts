import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { accountDb, openAccountDatabase } from "../../src/features/account/server/database.ts";
import { handleAccountRequest } from "../../src/features/account/server/account-http.ts";
import { hashPassword } from "../../src/features/account/server/credentials.ts";
import { readJson } from "../../src/features/account/server/http.ts";
import { accountMailTransport } from "../../src/features/account/server/mail.ts";
import { canUseAiChat, findSession } from "../../src/features/account/server/store.ts";

const directory = await mkdtemp(join(tmpdir(), "sophia-accounts-"));
const outbox = join(directory, "outbox.jsonl");
const origin = "http://127.0.0.1:3391";
const password = "Съешь ещё этих мягких булок";
const newPassword = "A different long passphrase";
const pair = { password, confirmPassword: password };
Object.assign(process.env, {
  ACCOUNT_MODE: "local", ACCOUNT_ORIGIN: origin, ACCOUNT_DB_PATH: join(directory, "account.sqlite"),
  ACCOUNT_MAIL_TRANSPORT: "test", ACCOUNT_TEST_OUTBOX: outbox,
});

beforeEach(() => accountDb().exec("DELETE FROM account_rate_limits"));
after(async () => {
  accountDb().close();
  await rm(directory, { recursive: true, force: true });
});

async function post(action: string, data: unknown, options: { token?: string; origin?: string } = {}) {
  const deferred: (() => Promise<void>)[] = [];
  const response = await handleAccountRequest(new Request(`${origin}/api/account/${action}`, {
    method: "POST", headers: { origin: options.origin ?? origin, "content-type": "application/json" },
    body: JSON.stringify(data),
  }), action, () => options.token, callback => deferred.push(callback));
  await Promise.all(deferred.map(callback => callback()));
  return response;
}

async function tokenFromMail(to: string, kind: "verify" | "reset") {
  const entries: { to: string; kind: string; url: string }[] =
    (await readFile(outbox, "utf8")).trim().split("\n").map(line => JSON.parse(line));
  const entry = entries.findLast(entry => entry.to === to && entry.kind === kind);
  assert.ok(entry);
  const url = new URL(entry.url);
  assert.equal(url.origin, origin);
  assert.equal(url.pathname, kind === "verify" ? "/verify-email" : "/reset-password");
  assert.equal(url.search, "");
  const token = new URLSearchParams(url.hash.slice(1)).get("token");
  assert.ok(token);
  return token;
}

function cookieFrom(response: Response) {
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  assert.ok(cookie.includes("HttpOnly") && cookie.includes("SameSite=Lax") && cookie.includes("Path=/"));
  const token = cookie.match(/=([A-Za-z0-9_-]{43});/)?.[1];
  assert.ok(token);
  return token;
}

async function activate(email: string) {
  assert.equal((await post("register", { email, displayName: "София", ...pair })).status, 200);
  assert.equal((await post("verify", { token: await tokenFromMail(email, "verify"), ...pair })).status, 200);
}

const login = (email: string, candidate = password, token?: string) => post("login", { email, password: candidate }, { token });

test("validates registration before accepting data", async () => {
  const good = { email: "valid@example.net", displayName: "София", ...pair };
  for (const change of [{ email: "wrong" }, { displayName: "" }, { password: "short" },
    { password: "x".repeat(129) }, { confirmPassword: "different" }]) {
    assert.equal((await post("register", { ...good, ...change })).status, 400);
  }
  assert.equal((await post("register", {})).status, 400);
});

test("accepts eight-character passwords and caps new account fields at fifty characters", async () => {
  const email = "short-pass@example.net";
  const draft = { email, displayName: "a".repeat(50), password: "12345678", confirmPassword: "12345678" };
  for (const change of [
    { password: "1234567", confirmPassword: "1234567" },
    { password: "a".repeat(51), confirmPassword: "a".repeat(51) },
    { displayName: "a".repeat(51) },
    { email: "a".repeat(40) + "@example.net" },
  ]) assert.equal((await post("register", { ...draft, ...change })).status, 400);
  assert.equal((await post("register", draft)).status, 200);
  const token = await tokenFromMail(email, "verify");
  const tooLong = "a".repeat(51);
  assert.equal((await post("verify", { token, password: tooLong, confirmPassword: tooLong })).status, 400);
  assert.equal((await post("verify", { token, password: draft.password, confirmPassword: draft.password })).status, 200);
  assert.equal((await login(email, draft.password)).status, 200);
});

test("previously issued long credentials still work for sign-in and recovery", async () => {
  const email = "long-identity".repeat(4) + "@example.net";
  const previousPassword = "Long passphrase used before the field limit ".repeat(2);
  const now = Date.now();
  accountDb().prepare("INSERT INTO account_users VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run("long-credentials-fixture", email, "София", await hashPassword(previousPassword), now, now, now);
  assert.equal((await login(email, previousPassword)).status, 200);
  assert.equal((await post("forgot", { email })).status, 200);
  assert.ok(await tokenFromMail(email, "reset"));
});

test("registration normalizes email and activation requires a fresh credential chosen by the email owner", async () => {
  const email = "owner@example.net";
  assert.equal((await post("register", { email: " Owner@EXAMPLE.NET ", displayName: "Первое имя", ...pair })).status, 200);
  assert.equal((await login(email)).status, 401);
  const token = await tokenFromMail(email, "verify");
  const attempts = await Promise.all([1, 2].map(() => post("verify", { token, password: newPassword, confirmPassword: newPassword })));
  assert.deepEqual(attempts.map(result => result.status).sort(), [200, 400]);
  assert.equal((await login(email)).status, 401);
  assert.equal((await login(email, newPassword)).status, 200);
  const before = await readFile(outbox, "utf8");
  assert.equal((await post("register", { email, displayName: "Чужое имя", ...pair })).status, 200);
  assert.equal(await readFile(outbox, "utf8"), before);
  assert.equal(accountDb().prepare("SELECT count(*) AS count FROM account_users WHERE email = ?").get(email)?.count, 1);
});

test("sessions rotate at sign-in, expire, and cannot be replayed after logout", async () => {
  const email = "session@example.net";
  await activate(email);
  const before = cookieFrom(await login(email));
  const token = cookieFrom(await login(email, password, before));
  assert.notEqual(token, before);
  assert.equal(findSession(before), null);
  const user = findSession(token);
  assert.ok(user);
  assert.equal(findSession(token, Date.now() + 31 * 24 * 60 * 60_000), null);
  assert.equal((await post("logout", { accountId: user.id }, { token })).status, 200);
  assert.equal(findSession(token), null);
});

test("resends verification for a pending address within the registration quota", async () => {
  const email = "resend@example.net";
  const registration = { email, displayName: "Исходное имя", ...pair };
  assert.equal((await post("register", registration)).status, 200);
  const initial = await tokenFromMail(email, "verify");
  assert.equal((await post("resend-verification", { email }, { origin: "https://other.example" })).status, 403);
  const resent = await post("resend-verification", { email: " RESEND@EXAMPLE.NET " });
  assert.equal(resent.status, 200);
  const acknowledged = await resent.json();
  const renewed = await tokenFromMail(email, "verify");
  assert.notEqual(renewed, initial);
  assert.equal((await post("verify", { token: renewed, ...pair })).status, 200);
  assert.equal((await post("verify", { token: initial, ...pair })).status, 400);
  assert.equal(accountDb().prepare("SELECT display_name FROM account_users WHERE email = ?").get(email)?.display_name, registration.displayName);

  const before = await readFile(outbox, "utf8");
  for (const address of [email, "unknown-resend@example.net"]) {
    const response = await post("resend-verification", { email: address });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), acknowledged);
  }
  assert.equal(await readFile(outbox, "utf8"), before);
  const limited = await post("resend-verification", { email });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
});

test("password reset responds generically, consumes tokens atomically, and revokes all sessions", async () => {
  const email = "reset@example.net";
  await activate(email);
  const first = cookieFrom(await login(email));
  const second = cookieFrom(await login(email));
  assert.deepEqual(await (await post("forgot", { email })).json(), await (await post("forgot", { email: "missing@example.net" })).json());
  const token = await tokenFromMail(email, "reset");
  const body = { token, password: newPassword, confirmPassword: newPassword };
  const attempts = await Promise.all([post("reset", body), post("reset", body)]);
  assert.deepEqual(attempts.map(result => result.status).sort(), [200, 400]);
  assert.equal((await post("reset", body)).status, 400);
  assert.equal(findSession(first), null);
  assert.equal(findSession(second), null);
  assert.equal((await login(email)).status, 401);
  assert.equal((await login(email, newPassword)).status, 200);
});

test("blocks cross-origin and stale-account mutations", async () => {
  const email = "profile@example.net";
  await activate(email);
  const token = cookieFrom(await login(email));
  const user = findSession(token);
  assert.ok(user);
  assert.equal((await post("profile", { accountId: user.id, displayName: "Чужое имя" }, { token, origin: "https://attacker.example" })).status, 403);
  assert.equal((await post("profile", { accountId: "other-user", displayName: "Чужое имя" }, { token })).status, 409);
  assert.equal((await post("profile", { accountId: user.id, displayName: "Новое имя", ai_chat: true }, { token })).status, 400);
  assert.equal(canUseAiChat(user.id), false);
  assert.equal(findSession(token)?.displayName, "София");
  assert.equal((await post("profile", { accountId: user.id, displayName: "Новое имя" }, { token })).status, 200);
  assert.equal(findSession(token)?.displayName, "Новое имя");
});

test("limits repeated password attempts", async () => {
  for (let attempt = 0; attempt < 6; attempt++) assert.equal((await login("guess@example.net")).status, 401);
  const response = await login("guess@example.net");
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("retry-after")) > 0);
});

test("registration fails safely when configured test delivery fails", async () => {
  const email = "no-delivery@example.net";
  process.env.ACCOUNT_TEST_OUTBOX = directory;
  try {
    assert.equal((await post("register", { email, displayName: "София", ...pair })).status, 503);
    assert.equal(accountDb().prepare("SELECT count(*) AS count FROM account_challenges WHERE email = ?").get(email)?.count, 0);
  } finally {
    process.env.ACCOUNT_TEST_OUTBOX = outbox;
  }
});

test("fails closed without verified proxy headers and uses a host-only secure cookie over HTTPS", async () => {
  const email = "proxy@example.net";
  await activate(email);
  const proxyOrigin = "https://sophia.example.net";
  const proxySecret = "d".repeat(64);
  const oldSecret = process.env.CHAT_PROXY_SECRET;
  Object.assign(process.env, { ACCOUNT_MODE: "proxy", ACCOUNT_ORIGIN: proxyOrigin, CHAT_PROXY_SECRET: proxySecret });
  const attempt = (headers: Record<string, string>) => handleAccountRequest(new Request(proxyOrigin, {
    method: "POST", headers: { origin: proxyOrigin, "content-type": "application/json", ...headers },
    body: JSON.stringify({ email, password }),
  }), "login", () => undefined, () => undefined);
  try {
    assert.equal((await attempt({ "x-forwarded-for": "192.0.2.1" })).status, 503);
    const response = await attempt({ "x-sophia-proxy-token": proxySecret, "x-sophia-client-ip": "192.0.2.1" });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie");
    assert.ok(cookie?.startsWith("__Host-sophia-session=") && cookie.endsWith("; Secure") && !cookie.includes("Domain"));
    assert.throws(accountMailTransport, { status: 503 });
  } finally {
    Object.assign(process.env, { ACCOUNT_MODE: "local", ACCOUNT_ORIGIN: origin });
    if (oldSecret === undefined) delete process.env.CHAT_PROXY_SECRET;
    else process.env.CHAT_PROXY_SECRET = oldSecret;
  }
});

test("stores only session and challenge token digests and a salted Argon2id password hash", async () => {
  const email = "hashes@example.net";
  const db = accountDb();
  await post("register", { email, displayName: "София", ...pair });
  const token = await tokenFromMail(email, "verify");
  const challenge = db.prepare("SELECT token_hash FROM account_challenges WHERE email = ?").get(email);
  assert.match(String(challenge?.token_hash), /^[a-f\d]{64}$/);
  await post("verify", { token, ...pair });
  const cookie = cookieFrom(await login(email));
  const user = findSession(cookie);
  assert.ok(user);
  const row = db.prepare(`SELECT u.password_hash, s.token_hash FROM account_users AS u
    JOIN account_sessions AS s ON s.user_id = u.id WHERE u.id = ?`).get(user.id);
  assert.match(String(row?.password_hash), /^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
  assert.match(String(row?.token_hash), /^[a-f\d]{64}$/);
  assert.notEqual(row?.token_hash, cookie);
});

test("rejects a different database and never runs account migrations on it", () => {
  const path = join(directory, "finance.sqlite");
  const wrong = new DatabaseSync(path);
  try {
    wrong.exec("CREATE TABLE ledger (amount INTEGER)");
    assert.throws(() => openAccountDatabase(path, true), /Unrecognized accounts database schema/);
    assert.equal(wrong.prepare("SELECT 1 FROM sqlite_schema WHERE name = 'account_users'").get(), undefined);
  } finally {
    wrong.close();
  }
});

test("rejects expired verification links and tokens from the wrong operation", async () => {
  const email = "expired@example.net";
  await post("register", { email, displayName: "София", ...pair });
  const token = await tokenFromMail(email, "verify");
  assert.equal((await post("reset", { token, ...pair })).status, 400);
  accountDb().prepare("UPDATE account_challenges SET expires_at = 1 WHERE email = ?").run(email);
  assert.equal((await post("verify", { token, ...pair })).status, 400);
  assert.equal((await login(email)).status, 401);
});

test("caps JSON bodies without relying on content length and rejects requests with a missing origin", async () => {
  const action = "forgot";
  const target = `${origin}/api/account/${action}`;
  const call = (headers: Record<string, string>, body: string) => handleAccountRequest(new Request(target, {
    method: "POST", headers: { "content-type": "application/json", ...headers }, body,
  }), action, () => undefined, () => undefined);
  assert.equal((await call({}, '{"email":"example@example.net"}')).status, 403);
  assert.equal((await call({ origin }, " ".repeat(8193))).status, 413);
  assert.equal((await call({ origin }, "[]")).status, 400);
  assert.equal((await call({ origin, "content-type": "text/plain" }, "{}")).status, 415);
});

test("cancels stalled or disconnected JSON request bodies", async () => {
  const controller = new AbortController();
  for (const disconnected of [false, true]) {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const body = new ReadableStream<Uint8Array>({
      start(stream) {
        timer = setTimeout(() => stream.close(), 1000);
      },
      cancel() {
        clearTimeout(timer);
        cancelled = true;
      },
    });
    const request = new Request(origin, {
      method: "POST", headers: { "content-type": "application/json" }, body, duplex: "half", signal: controller.signal,
    } as RequestInit & { duplex: "half" });
    const result = readJson(request, 8192, 25);
    if (disconnected) controller.abort();
    await assert.rejects(result, { status: disconnected ? 499 : 408 });
    assert.equal(cancelled, true);
  }
});

test("a local operator can migrate, grant and revoke AI access for a verified account", async () => {
  const email = "entitled@example.net";
  const cli = (...args: string[]) => spawnSync(process.execPath, ["scripts/accounts/cli.ts", ...args], { encoding: "utf8" });
  const migration = cli("migrate");
  assert.equal(migration.status, 0, migration.stderr);
  assert.match(migration.stdout, /schema 2/);
  assert.equal(cli("grant-ai-chat", email).status, 1);
  await activate(email);
  const user = findSession(cookieFrom(await login(email)));
  assert.ok(user);
  assert.equal(canUseAiChat(user.id), false);
  const grant = cli("grant-ai-chat", email);
  assert.equal(grant.status, 0, grant.stderr);
  assert.equal(canUseAiChat(user.id), true);
  const revoke = cli("revoke-ai-chat", email);
  assert.equal(revoke.status, 0, revoke.stderr);
  assert.equal(canUseAiChat(user.id), false);
});
