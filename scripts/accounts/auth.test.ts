import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, test } from "node:test";
import { backup, DatabaseSync } from "node:sqlite";
import { legalAcceptance, legalVersions } from "../../tests/support/legal-confirmations.ts";
import { cleanupAccounts } from "../../src/features/account/server/cleanup.ts";
import { ACCOUNT_PROGRESS_SCHEMA } from "../../src/features/account/progress/server/schema.ts";
import { ACCOUNT_PROFILE_MAILING_CONSENT_SCHEMA } from "../../src/features/legal/server/schema.ts";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { accountDb, openAccountDatabase } from "../../src/features/account/server/database.ts";
import { handleAccountRequest } from "../../src/features/account/server/account-http.ts";
import { hashPassword, newToken, tokenHash } from "../../src/features/account/server/credentials.ts";
import { readJson } from "../../src/features/account/server/http.ts";
import { accountMailTransport } from "../../src/features/account/server/mail.ts";
import { limitAccountRequests } from "../../src/features/account/server/rate-limits.ts";
import { canUseAiChat, findSession, hasMailingConsent } from "../../src/features/account/server/store.ts";
import { createEmailService } from "../../src/lib/server/email-service.ts";

const directory = await mkdtemp(join(tmpdir(), "sophia-accounts-"));
const outbox = join(directory, "outbox.jsonl");
const readOutbox = () => existsSync(outbox) ? readFile(outbox, "utf8") : Promise.resolve("");
const origin = "http://127.0.0.1:3391";
const password = "Съешь ещё этих мягких булок";
const newPassword = "A different long passphrase";
const pair = { password, confirmPassword: password };
const unsupportedEmail = "На данный момент регистрация доступна только с использованием российских почтовых сервисов: Яндекс, Mail.ru, Рамблер и VK Почта";
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
  assert.equal((await post("register", { ...legalAcceptance, email, displayName: "София" })).status, 200);
  assert.equal((await post("verify", { ...legalAcceptance, token: await tokenFromMail(email, "verify"), ...pair })).status, 200);
}

const login = (email: string, candidate = password, token?: string) => post("login", { email, password: candidate }, { token });

test("validates registration before accepting data", async () => {
  const good = { email: "valid@mail.ru", displayName: "София", ...legalAcceptance };
  for (const change of [{ email: "wrong" }, { displayName: "" }, pair]) {
    assert.equal((await post("register", { ...good, ...change })).status, 400);
  }
  assert.equal((await post("register", {})).status, 400);
  assert.equal((await post("register", good)).status, 200);
  assert.ok(await tokenFromMail(good.email, "verify"));
});

test("registration rejects a request without legal confirmations without creating a challenge", async () => {
  const email = "no-consent@mail.ru";
  const before = await readOutbox();
  const body = { email, displayName: "София" };
  assert.equal((await post("register", body)).status, 400);
  for (const kind of ["age", "terms", "consent"]) {
    for (const value of [undefined, false, "true", 1]) {
      assert.equal((await post("register", { ...body, ...legalAcceptance, [kind]: value })).status, 400);
    }
  }
  assert.equal((await post("register", { ...body, ...legalAcceptance, legalVersions: { ...legalVersions, privacy: "0.9" } })).status, 409);
  assert.equal(accountDb().prepare("SELECT 1 FROM account_challenges WHERE email = ?").get(email), undefined);
  assert.equal(await readOutbox(), before);
});

test("mailing consent is optional, versioned, confirmed by the email owner and withdrawable independently", async () => {
  const db = accountDb();
  const mailing = { mailingConsentVersion: "1.0-draft.2" };
  const email = "mailing-owner@mail.ru";
  const register = { ...legalAcceptance, email, displayName: "София" };
  const before = Date.now();
  assert.equal((await post("register", { ...register, ...mailing, age: false })).status, 400);
  assert.equal((await post("register", { ...register, mailingConsentVersion: "old" })).status, 409);
  assert.equal((await post("register", { ...register, ...mailing })).status, 200);
  const token = await tokenFromMail(email, "verify");
  const receipt = db.prepare(`SELECT r.user_id, m.version, m.confirmed_at, m.withdrawn_at, m.document
    FROM account_mailing_consents AS m JOIN account_registrations AS r ON r.id = m.registration_id
    WHERE r.id = ?`);
  const registrationId = String(db.prepare("SELECT registration_id FROM account_challenges WHERE token_hash = ?")
    .get(tokenHash(token))?.registration_id);
  const pending = receipt.get(registrationId);
  assert.ok(pending);
  assert.equal(pending.user_id, null);
  assert.equal(pending.version, mailing.mailingConsentVersion);
  assert.ok(Number(pending.confirmed_at) >= before);
  assert.match(String(pending.document), /Согласие на получение рекламных и информационных рассылок/);
  const verify = { ...legalAcceptance, token, ...pair };
  assert.equal((await post("verify", { ...verify, mailingConsentVersion: true })).status, 409);
  assert.equal((await post("verify", { ...verify, ...mailing })).status, 200);
  const session = cookieFrom(await login(email));
  const accountId = findSession(session)?.id;
  assert.ok(accountId);
  const confirmed = receipt.get(registrationId);
  assert.equal(confirmed?.user_id, accountId);
  assert.equal(confirmed?.version, pending.version);
  assert.ok(Number(confirmed?.confirmed_at) >= Number(pending.confirmed_at));
  assert.equal(confirmed?.withdrawn_at, null);

  const withdraw = "withdraw-mailing-consent";
  assert.equal((await post(withdraw, { accountId })).status, 401);
  assert.equal((await post(withdraw, { accountId: "another-account" }, { token: session })).status, 409);
  assert.equal((await post(withdraw, { accountId }, { token: session, origin: "https://other.example" })).status, 403);
  assert.equal((await post(withdraw, { accountId }, { token: session })).status, 200);
  const revoked = receipt.get(registrationId);
  assert.ok(Number(revoked?.withdrawn_at) >= Number(confirmed?.confirmed_at));
  assert.equal((await post(withdraw, { accountId }, { token: session })).status, 200);
  assert.deepEqual(receipt.get(registrationId), revoked);
  assert.equal(findSession(session)?.id, accountId);
  assert.equal(hasMailingConsent(accountId), false);
  assert.equal((await post("grant-mailing-consent", { accountId, ...mailing }, { token: session })).status, 200);
  assert.equal(hasMailingConsent(accountId), true);
  assert.deepEqual(receipt.get(registrationId), revoked);
  assert.equal((await post("delete-account", { accountId, password, confirm: true }, { token: session })).status, 200);
  assert.equal(receipt.get(registrationId), undefined);

  const uncheckedEmail = "mailing-unchecked@mail.ru";
  assert.equal((await post("register", { ...register, email: uncheckedEmail, ...mailing })).status, 200);
  const uncheckedToken = await tokenFromMail(uncheckedEmail, "verify");
  const uncheckedRegistration = String(db.prepare("SELECT registration_id FROM account_challenges WHERE token_hash = ?")
    .get(tokenHash(uncheckedToken))?.registration_id);
  assert.ok(receipt.get(uncheckedRegistration));
  assert.equal((await post("verify", { ...legalAcceptance, token: uncheckedToken, ...pair })).status, 200);
  assert.equal(receipt.get(uncheckedRegistration), undefined);
});

test("profile mailing consent supports repeated opt-in and revocation for a legacy account", async () => {
  const db = accountDb();
  const accountId = "legacy-mailing-user";
  const email = "legacy-mailing@mail.ru";
  const now = Date.now();
  db.prepare("INSERT INTO account_users VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(accountId, email, "София", await hashPassword(password), now, now, now);
  const session = cookieFrom(await login(email));
  const grant = "grant-mailing-consent";
  const withdraw = "withdraw-mailing-consent";
  const choice = { accountId, mailingConsentVersion: "1.0-draft.2" };
  assert.equal(hasMailingConsent(accountId), false);
  assert.equal((await post(grant, choice)).status, 401);
  assert.equal((await post(grant, { ...choice, accountId: "another-account" }, { token: session })).status, 409);
  assert.equal((await post(grant, choice, { token: session, origin: "https://other.example" })).status, 403);
  assert.equal((await post(grant, { accountId }, { token: session })).status, 400);
  assert.equal((await post(grant, { ...choice, mailingConsentVersion: "1.0-draft.1" }, { token: session })).status, 409);
  assert.equal(hasMailingConsent(accountId), false);

  const rows = db.prepare(`SELECT s.version, s.document, c.confirmed_at, c.withdrawn_at
    FROM account_profile_mailing_consents c JOIN account_mailing_revisions s ON s.id = c.revision_id
    WHERE c.user_id = ? ORDER BY c.id`);
  assert.equal((await post(grant, choice, { token: session })).status, 200);
  assert.equal(hasMailingConsent(accountId), true);
  assert.equal((await post(grant, choice, { token: session })).status, 200);
  assert.equal(rows.all(accountId).length, 1);
  assert.equal((await post(withdraw, { accountId }, { token: session })).status, 200);
  assert.equal(hasMailingConsent(accountId), false);
  const first = rows.get(accountId);
  assert.ok(first);
  assert.equal(first.version, choice.mailingConsentVersion);
  assert.match(String(first.document), /Согласие на получение рекламных и информационных рассылок/);
  assert.ok(Number(first.confirmed_at) >= now);
  assert.ok(Number(first.withdrawn_at) >= Number(first.confirmed_at));

  assert.equal((await post(grant, choice, { token: session })).status, 200);
  assert.equal(hasMailingConsent(accountId), true);
  assert.deepEqual(rows.get(accountId), first);
  assert.equal(rows.all(accountId).length, 2);
  assert.equal(rows.all(accountId)[1].withdrawn_at, null);
  for (let index = 0; index < 2; index++) {
    assert.equal((await post(withdraw, { accountId }, { token: session })).status, 200);
    assert.equal((await post(grant, choice, { token: session })).status, 200);
  }
  assert.equal((await post(withdraw, { accountId }, { token: session })).status, 200);
  assert.equal((await post(grant, choice, { token: session })).status, 429);
  assert.equal(hasMailingConsent(accountId), false);
  assert.equal(rows.all(accountId).length, 4);
  assert.equal(db.prepare("SELECT count(*) AS total FROM account_mailing_revisions").get()?.total, 1);
  assert.equal(findSession(session)?.id, accountId);
  assert.equal((await post("delete-account", { accountId, password, confirm: true }, { token: session })).status, 200);
  assert.equal(rows.all(accountId).length, 0);
});

test("schema 6 mailing history keeps each timestamp, revision and account on migration", () => {
  const path = join(directory, "mailing-migration.sqlite");
  using old = openAccountDatabase(path, true);
  old.exec(`DROP TABLE account_profile_mailing_consents; DROP TRIGGER account_mailing_revisions_no_delete;
    DROP TABLE account_mailing_revisions; ${ACCOUNT_PROFILE_MAILING_CONSENT_SCHEMA} PRAGMA user_version = 6;`);
  old.prepare("INSERT INTO account_users VALUES (?, ?, ?, ?, ?, ?, ?)").run("history", "history@example.test", "Тест", "fixture", 1, 1, 1);
  old.exec(`INSERT INTO account_profile_mailing_consents VALUES
    (8, 'history', 'fixture-v1', 'old snapshot', 10, 12), (9, 'history', 'fixture-v1', 'old snapshot', 20, NULL);`);
  using migrated = openAccountDatabase(path);
  const rows = migrated.prepare(`SELECT c.id, c.user_id, r.version, r.document, c.confirmed_at, c.withdrawn_at
    FROM account_profile_mailing_consents c JOIN account_mailing_revisions r ON r.id = c.revision_id ORDER BY c.id`)
    .all().map(row => Object.values(row));
  assert.deepEqual(rows, [
    [8, "history", "fixture-v1", "old snapshot", 10, 12], [9, "history", "fixture-v1", "old snapshot", 20, null],
  ]);
  assert.equal(migrated.prepare("SELECT COUNT(*) AS total FROM account_mailing_revisions").get()?.total, 1);
  assert.deepEqual(migrated.prepare("PRAGMA foreign_key_check").all(), []);
});

test("an online snapshot can be restored without returning deleted accounts or stale credentials", async () => {
  const original = join(directory, "restore-source.sqlite");
  const snapshot = join(directory, "restore-snapshot.sqlite");
  using source = openAccountDatabase(original, true);
  const stored = await hashPassword(password);
  const insert = source.prepare("INSERT INTO account_users VALUES (?, ?, ?, ?, ?, ?, ?)");
  insert.run("keep", "keep@example.test", "Тест", stored, 1, 1, 1);
  insert.run("erased", "erased@example.test", "Тест", stored, 1, 1, 1);
  source.exec(`INSERT INTO account_entitlements VALUES ('keep', 'ai_chat', 1);
    INSERT INTO account_sessions VALUES ('${"a".repeat(64)}', 'keep', 1, 2);
    INSERT INTO account_challenges (token_hash, kind, email, user_id, expires_at)
      VALUES ('${"b".repeat(64)}', 'reset', 'keep@example.test', 'keep', 2);`);
  await backup(source, snapshot);
  source.exec("DELETE FROM account_users WHERE id = 'erased'");
  const restore = await readFile("deploy/sql/prepare-account-restore.sql", "utf8");
  using restored = openAccountDatabase(snapshot);
  assert.throws(() => restored.exec(restore), /retained_accounts/);
  restored.exec("ROLLBACK");
  assert.equal(restored.prepare("SELECT count(*) AS total FROM account_users").get()?.total, 2);
  restored.exec("CREATE TEMP TABLE retained_accounts (id TEXT PRIMARY KEY); INSERT INTO retained_accounts VALUES ('keep');");
  restored.exec(restore);
  const users = restored.prepare("SELECT id, password_hash FROM account_users").all();
  assert.deepEqual(users.map(row => [row.id, row.password_hash]), [["keep", "!restore-reset-required"]]);
  assert.equal(restored.prepare("SELECT count(*) AS total FROM account_entitlements").get()?.total, 0);
  assert.equal(restored.prepare("SELECT count(*) AS total FROM account_sessions").get()?.total, 0);
  assert.equal(restored.prepare("SELECT count(*) AS total FROM account_challenges").get()?.total, 0);
  assert.equal(restored.prepare("PRAGMA integrity_check").get()?.integrity_check, "ok");
  assert.deepEqual(restored.prepare("PRAGMA foreign_key_check").all(), []);
});

test("drafts block registration, resend and activation in proxy mode before issuing mail", async () => {
  const previous = process.env.CHAT_PROXY_SECRET;
  const secret = "f".repeat(64);
  const proxy = "https://example.test";
  const before = await readOutbox();
  await withSmtpSettings(async () => {
    Object.assign(process.env, { ACCOUNT_ORIGIN: proxy, CHAT_PROXY_SECRET: secret });
    try {
      for (const [action, body] of [
        ["register", { email: "closed@mail.ru", displayName: "София", ...legalAcceptance }],
        ["resend-verification", { email: "closed@mail.ru" }],
        ["verify", { token: newToken(), ...pair, ...legalAcceptance }],
      ] as const) {
        const response = await handleAccountRequest(new Request(proxy, {
          method: "POST", headers: { origin: proxy, "content-type": "application/json",
            "x-sophia-proxy-token": secret, "x-sophia-client-ip": "192.0.2.1" },
          body: JSON.stringify(body),
        }), action, () => undefined, () => assert.fail("must not schedule mail"));
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), { error: "Регистрация пока недоступна." });
      }
    } finally {
      if (previous === undefined) delete process.env.CHAT_PROXY_SECRET;
      else process.env.CHAT_PROXY_SECRET = previous;
    }
  });
  assert.equal(accountDb().prepare("SELECT 1 FROM account_challenges WHERE email = 'closed@mail.ru'").get(), undefined);
  assert.equal(accountDb().prepare("SELECT 1 FROM account_rate_limits").get(), undefined);
  assert.equal(await readOutbox(), before);
});

test("pins immutable legal revisions and requires all confirmations from the email owner", async () => {
  const email = "legal-evidence@mail.ru";
  const db = accountDb();
  const before = Date.now();
  const body = { email, displayName: "София", ...legalAcceptance };
  assert.equal((await post("register", body)).status, 200);
  const token = await tokenFromMail(email, "verify");
  const request = db.prepare(`SELECT id, privacy_version, account_registrations.expires_at AS expires_at FROM account_registrations
    JOIN account_challenges ON registration_id = id WHERE token_hash = ?`).get(tokenHash(token));
  assert.equal(typeof request?.id, "string");
  assert.ok(request && typeof request.id === "string" && typeof request.expires_at === "number");
  assert.equal(request.privacy_version, legalVersions.privacy);
  const receipts = db.prepare("SELECT kind, version, confirmed_at FROM account_legal_confirmations WHERE registration_id = ? ORDER BY kind").all(request.id);
  assert.deepEqual(receipts.map(({ kind, version }) => [kind, version]), [
    ["age", legalVersions.age], ["consent", legalVersions.consent], ["terms", legalVersions.terms],
  ]);
  for (const receipt of receipts) assert.ok(Number(receipt.confirmed_at) >= before);
  const original = db.prepare("SELECT content, sha256 FROM legal_revisions WHERE kind = 'terms' AND version = ?").get(legalVersions.terms);
  assert.ok(original && typeof original.content === "string");
  assert.ok(JSON.parse(original.content).body.includes("Стороны и предмет"));
  assert.equal(original.sha256, tokenHash(original.content));
  assert.throws(() => db.exec("UPDATE legal_revisions SET content = 'rewritten'"), /immutable/);
  assert.throws(() => db.exec("DELETE FROM legal_revisions"), /immutable/);
  assert.throws(() => db.exec("INSERT OR REPLACE INTO legal_revisions SELECT * FROM legal_revisions"), /immutable/);

  assert.equal((await post("resend-verification", { email })).status, 200);
  const resent = await tokenFromMail(email, "verify");
  assert.deepEqual({ ...db.prepare("SELECT registration_id, expires_at FROM account_challenges WHERE token_hash = ?").get(tokenHash(resent)) },
    { registration_id: request.id, expires_at: request.expires_at });
  assert.equal((await post("verify", { token: resent, ...pair })).status, 400);
  assert.equal((await post("verify", { token: resent, ...pair, ...legalAcceptance, consent: false })).status, 400);
  assert.equal((await post("verify", { token: resent, ...pair, ...legalAcceptance,
    legalVersions: { ...legalVersions, consent: "0.9" } })).status, 409);
  assert.equal((await post("verify", { token: resent, ...pair, ...legalAcceptance })).status, 200);
  const linked = db.prepare(`SELECT u.email, r.verified_at, r.expires_at FROM account_registrations AS r
    JOIN account_users AS u ON u.id = r.user_id WHERE r.id = ?`).get(request.id);
  assert.equal(linked?.email, email);
  assert.equal(linked?.expires_at, null);
  assert.ok(Number(linked?.verified_at) >= Number(receipts[0].confirmed_at));
  assert.deepEqual(db.prepare("SELECT kind, version, confirmed_at FROM account_legal_confirmations WHERE registration_id = ? ORDER BY kind").all(request.id), receipts);
});

test("verification rejects a valid token whose registration evidence is incomplete", async () => {
  const email = "broken-evidence@mail.ru";
  const db = accountDb();
  await post("register", { email, displayName: "София", ...legalAcceptance });
  const token = await tokenFromMail(email, "verify");
  db.prepare(`DELETE FROM account_legal_confirmations WHERE kind = 'age' AND registration_id IN
    (SELECT registration_id FROM account_challenges WHERE email = ?)`).run(email);
  const result = await post("verify", { token, ...pair, ...legalAcceptance });
  assert.equal(result.status, 400);
  assert.equal(db.prepare("SELECT 1 FROM account_users WHERE email = ?").get(email), undefined);
});

test("account deletion and withdrawal require reauthentication and cascade through account data", async () => {
  const db = accountDb();
  for (const action of ["delete-account", "withdraw-consent"]) {
    const email = `${action}@mail.ru`;
    await activate(email);
    const session = cookieFrom(await login(email));
    const second = cookieFrom(await login(email));
    const user = findSession(session);
    assert.ok(user);
    const request = db.prepare("SELECT id FROM account_registrations WHERE user_id = ?").get(user.id);
    assert.ok(typeof request?.id === "string");
    const body = { accountId: user.id, password, confirm: true };
    db.prepare("INSERT INTO account_lesson_progress (user_id, lesson_id) VALUES (?, 'fixture')").run(user.id);
    db.prepare("INSERT INTO account_slide_progress VALUES (?, 'fixture', 'first')").run(user.id);
    db.prepare("INSERT INTO account_last_opened_lesson VALUES (?, 'fixture')").run(user.id);
    db.prepare("INSERT INTO account_entitlements VALUES (?, 'ai_chat', ?)").run(user.id, Date.now());
    assert.equal((await post("forgot", { email })).status, 200);
    const reset = await tokenFromMail(email, "reset");
    assert.equal((await post(action, body)).status, 401);
    assert.equal((await post(action, body, { token: session, origin: "https://other.example" })).status, 403);
    assert.equal((await post(action, { ...body, accountId: "other" }, { token: session })).status, 409);
    assert.equal((await post(action, { ...body, confirm: "true" }, { token: session })).status, 400);
    assert.equal((await post(action, { ...body, password: newPassword }, { token: session })).status, 401);
    assert.ok(findSession(second));
    const removals = await Promise.all([post(action, body, { token: session }), post(action, body, { token: second })]);
    assert.deepEqual(removals.map(result => result.status).sort(), [200, 401]);
    const response = removals.find(result => result.ok);
    assert.match(response?.headers.get("set-cookie") ?? "", /Max-Age=0/);
    assert.equal(findSession(session), null);
    assert.equal(findSession(second), null);
    assert.equal((await post("reset", { token: reset, ...pair })).status, 400);
    assert.equal(db.prepare("SELECT 1 FROM account_users WHERE id = ?").get(user.id), undefined);
    for (const table of ["account_sessions", "account_entitlements", "account_lesson_progress", "account_slide_progress",
      "account_last_opened_lesson", "account_registrations", "account_challenges"]) {
      assert.equal(db.prepare(`SELECT 1 FROM ${table} WHERE user_id = ?`).get(user.id), undefined, table);
    }
    assert.equal(db.prepare("SELECT 1 FROM account_legal_confirmations WHERE registration_id = ?").get(request.id), undefined);
    assert.ok(db.prepare("SELECT 1 FROM legal_revisions WHERE kind = 'terms'").get());
  }
});

test("daily cleanup removes expired sessions, tokens, pending requests and receipts", async () => {
  const db = accountDb();
  const email = "abandoned@mail.ru";
  await post("register", { email, displayName: "София", ...legalAcceptance });
  const pending = db.prepare("SELECT registration_id, expires_at FROM account_challenges WHERE email = ?").get(email);
  assert.ok(typeof pending?.registration_id === "string" && typeof pending.expires_at === "number");
  const activeEmail = "cleanup-active@mail.ru";
  await activate(activeEmail);
  const session = cookieFrom(await login(activeEmail));
  assert.equal((await post("forgot", { email: activeEmail })).status, 200);
  const reset = await tokenFromMail(activeEmail, "reset");
  const now = pending.expires_at + 1;
  db.prepare("UPDATE account_sessions SET expires_at = ? WHERE token_hash = ?").run(now, tokenHash(session));
  const next = cleanupAccounts(db, { now, force: true });
  assert.equal(next - now, 24 * 60 * 60_000);
  assert.equal(cleanupAccounts(db, { now: now + 10 }), next);
  assert.equal(db.prepare("SELECT 1 FROM account_sessions WHERE token_hash = ?").get(tokenHash(session)), undefined);
  assert.equal(db.prepare("SELECT 1 FROM account_challenges WHERE token_hash = ?").get(tokenHash(reset)), undefined);
  assert.equal(db.prepare("SELECT 1 FROM account_challenges WHERE email = ?").get(email), undefined);
  assert.equal(db.prepare("SELECT 1 FROM account_registrations WHERE id = ?").get(pending.registration_id), undefined);
  assert.equal(db.prepare("SELECT 1 FROM account_legal_confirmations WHERE registration_id = ?").get(pending.registration_id), undefined);
  assert.equal(db.prepare("SELECT 1 FROM account_rate_limits WHERE expires_at <= ?").get(now), undefined);
  assert.ok(db.prepare("SELECT 1 FROM account_registrations WHERE user_id IN (SELECT id FROM account_users WHERE email = ?)").get(activeEmail));
  assert.ok(db.prepare("SELECT 1 FROM legal_revisions").get());
});

test("migration removes a legacy verification link while preserving the account and reset token", () => {
  const path = join(directory, "legacy.sqlite");
  const legacy = new DatabaseSync(path);
  legacy.exec(`PRAGMA application_id = 1397706824;
    PRAGMA user_version = 2;
    CREATE TABLE account_users (id TEXT PRIMARY KEY);
    CREATE TABLE account_challenges (
      token_hash TEXT PRIMARY KEY, kind TEXT, email TEXT, user_id TEXT REFERENCES account_users(id),
      display_name TEXT, expires_at INTEGER
    );
    INSERT INTO account_users VALUES ('legacy-user');
    INSERT INTO account_challenges VALUES ('legacy-verify', 'verify', 'a@mail.ru', NULL, 'Name', 100);
    INSERT INTO account_challenges VALUES ('legacy-reset', 'reset', 'b@mail.ru', 'legacy-user', NULL, 100);
  `);
  legacy.exec(ACCOUNT_PROGRESS_SCHEMA);
  legacy.close();
  const migrated = openAccountDatabase(path);
  try {
    assert.equal(migrated.prepare("PRAGMA user_version").get()?.user_version, 7);
    assert.equal(migrated.prepare("SELECT COUNT(*) AS total FROM account_mailing_consents").get()?.total, 0);
    assert.equal(migrated.prepare("SELECT 1 FROM account_challenges WHERE kind = 'verify'").get(), undefined);
    assert.ok(migrated.prepare("SELECT 1 FROM account_challenges WHERE kind = 'reset'").get());
    assert.ok(migrated.prepare("SELECT 1 FROM account_users WHERE id = 'legacy-user'").get());
    assert.throws(() => migrated.exec("INSERT INTO account_challenges (kind) VALUES ('verify')"), /registration request/);
  } finally {
    migrated.close();
  }
});

test("cleanup retries an occupied WAL without postponing it to the next day", () => {
  const path = join(directory, "cleanup-wal.sqlite");
  const db = openAccountDatabase(path, true);
  const reader = new DatabaseSync(path, { readOnly: true });
  try {
    db.exec("INSERT INTO account_rate_limits VALUES ('old', 1, 1)");
    reader.exec("BEGIN");
    assert.ok(reader.prepare("SELECT 1 FROM account_rate_limits WHERE bucket = 'old'").get());
    const now = Date.now();
    assert.throws(() => cleanupAccounts(db, { now }), /write-ahead log is busy/);
    assert.equal(db.prepare("SELECT 1 FROM account_rate_limits WHERE bucket = 'old'").get(), undefined);
    assert.ok(statSync(path + "-wal").size > 0);
    reader.exec("ROLLBACK");
    assert.equal(cleanupAccounts(db, { now: now + 10 }), now + 24 * 60 * 60_000);
    assert.equal(statSync(path + "-wal").size, 0);
  } finally {
    reader.close();
    db.close();
  }
});

test("accepts each approved mail domain with whitespace and uppercase normalized", async () => {
  for (const domain of ["yandex.ru", "ya.ru", "mail.ru", "inbox.ru", "list.ru", "bk.ru", "internet.ru",
    "rambler.ru", "ro.ru", "lenta.ru", "autorambler.ru", "myrambler.ru", "vk.com", "vk.ru"]) {
    accountDb().exec("DELETE FROM account_rate_limits");
    const response = await post("register", { ...legalAcceptance, email: ` Domain-Fixture@${domain.toUpperCase()} `, displayName: "София" });
    assert.equal(response.status, 200, domain);
    assert.ok(await tokenFromMail(`domain-fixture@${domain}`, "verify"));
  }
});

test("rejects unsupported domains before any database write or email delivery", async () => {
  const before = await readOutbox();
  const db = accountDb();
  const countChallenges = () => db.prepare("SELECT count(*) AS count FROM account_challenges").get()?.count;
  const countBefore = countChallenges();
  for (const email of ["person@gmail.com", "person@vk.net", "person@outlook.com", "person@xmail.ru", "person@sub.mail.ru",
    "person@mail.ru.example.org", "person@notmail.ru", "person@maіl.ru", "person@ｍail.ru", "person@mail。ru"]) {
    const response = await post("register", { ...legalAcceptance, email, displayName: "София" });
    assert.equal(response.status, 400, email);
    assert.deepEqual(await response.json(), { error: unsupportedEmail }, email);
  }
  for (const email of ["person@other.org@mail.ru", "person@mail.ru.", "person@mail.ru/path", "person@mail.ru:443"]) {
    assert.equal((await post("register", { ...legalAcceptance, email, displayName: "София" })).status, 400, email);
  }
  assert.equal(countChallenges(), countBefore);
  assert.equal(db.prepare("SELECT 1 FROM account_rate_limits").get(), undefined);
  assert.equal(await readOutbox(), before);
});

test("a pending registration on an unsupported domain cannot resend or activate", async () => {
  const email = "pending-before-policy@example.net";
  const initial = "pending-before-policy@mail.ru";
  await post("register", { email: initial, displayName: "София", ...legalAcceptance });
  const token = await tokenFromMail(initial, "verify");
  const db = accountDb();
  db.prepare("UPDATE account_challenges SET email = ? WHERE token_hash = ?").run(email, tokenHash(token));
  const before = await readOutbox();
  for (const response of [await post("resend-verification", { email }), await post("verify", { ...legalAcceptance, token, ...pair })]) {
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: unsupportedEmail });
  }
  assert.equal(db.prepare("SELECT 1 FROM account_users WHERE email = ?").get(email), undefined);
  assert.equal(db.prepare("SELECT count(*) AS count FROM account_challenges WHERE email = ?").get(email)?.count, 1);
  assert.equal(await readOutbox(), before);
});

test("accepts eight-character passwords and caps new account fields at fifty characters", async () => {
  const email = "short-pass@mail.ru";
  const draft = { email, displayName: "a".repeat(50) };
  for (const change of [
    { displayName: "a".repeat(51) },
    { email: "a".repeat(44) + "@mail.ru" },
  ]) assert.equal((await post("register", { ...legalAcceptance, ...draft, ...change })).status, 400);
  assert.equal((await post("register", { ...legalAcceptance, ...draft })).status, 200);
  const token = await tokenFromMail(email, "verify");
  const verification = { ...legalAcceptance, token };
  const chosenPassword = "12345678";
  assert.equal((await post("verify", verification)).status, 400);
  for (const invalidPassword of ["1234567", "a".repeat(51)]) {
    assert.equal((await post("verify", { ...verification, password: invalidPassword, confirmPassword: invalidPassword })).status, 400);
  }
  assert.equal((await post("verify", { ...verification, password: chosenPassword, confirmPassword: "different" })).status, 400);
  assert.equal((await post("verify", { ...verification, password: chosenPassword, confirmPassword: chosenPassword })).status, 200);
  assert.equal((await login(email, chosenPassword)).status, 200);
});

test("existing long credentials and an unsupported email still work for sign-in and recovery", async () => {
  const email = "long-identity".repeat(4) + "@example.net";
  const previousPassword = "Long passphrase used before the field limit ".repeat(2);
  const now = Date.now();
  accountDb().prepare("INSERT INTO account_users VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run("long-credentials-fixture", email, "София", await hashPassword(previousPassword), now, now, now);
  assert.equal((await login(email, previousPassword)).status, 200);
  assert.equal((await post("forgot", { email })).status, 200);
  const token = await tokenFromMail(email, "reset");
  assert.equal((await post("reset", { token, password: newPassword, confirmPassword: newPassword })).status, 200);
  assert.equal((await login(email, newPassword)).status, 200);
});

test("registration normalizes email and the email owner sets the password at activation", async () => {
  const email = "owner@mail.ru";
  assert.equal((await post("register", { ...legalAcceptance, email: " Owner@MAIL.RU ", displayName: "Первое имя" })).status, 200);
  assert.equal((await login(email)).status, 401);
  const token = await tokenFromMail(email, "verify");
  const attempts = await Promise.all([1, 2].map(() => post("verify", { ...legalAcceptance, token, password: newPassword, confirmPassword: newPassword })));
  assert.deepEqual(attempts.map(result => result.status).sort(), [200, 400]);
  assert.equal((await login(email)).status, 401);
  assert.equal((await login(email, newPassword)).status, 200);
  const before = await readFile(outbox, "utf8");
  assert.equal((await post("register", { ...legalAcceptance, email, displayName: "Чужое имя" })).status, 200);
  assert.equal(await readFile(outbox, "utf8"), before);
  assert.equal(accountDb().prepare("SELECT count(*) AS count FROM account_users WHERE email = ?").get(email)?.count, 1);
});

test("sessions rotate at sign-in, expire, and cannot be replayed after logout", async () => {
  const email = "session@mail.ru";
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
  const email = "resend@mail.ru";
  const registration = { email, displayName: "Исходное имя", ...legalAcceptance };
  assert.equal((await post("register", registration)).status, 200);
  const initial = await tokenFromMail(email, "verify");
  assert.equal((await post("resend-verification", { email }, { origin: "https://other.example" })).status, 403);
  const resent = await post("resend-verification", { email: " RESEND@MAIL.RU " });
  assert.equal(resent.status, 200);
  const acknowledged = await resent.json();
  const renewed = await tokenFromMail(email, "verify");
  assert.notEqual(renewed, initial);
  assert.equal((await post("verify", { ...legalAcceptance, token: renewed, ...pair })).status, 200);
  assert.equal((await post("verify", { ...legalAcceptance, token: initial, ...pair })).status, 400);
  assert.equal(accountDb().prepare("SELECT display_name FROM account_users WHERE email = ?").get(email)?.display_name, registration.displayName);

  const before = await readFile(outbox, "utf8");
  for (const address of [email, "unknown-resend@mail.ru"]) {
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
  const email = "reset@mail.ru";
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
  const email = "profile@mail.ru";
  await activate(email);
  const token = cookieFrom(await login(email));
  const user = findSession(token);
  assert.ok(user);
  assert.equal((await post("profile", { accountId: user.id, displayName: "Чужое имя" }, { token, origin: "https://attacker.example" })).status, 403);
  assert.equal((await post("profile", { accountId: "other-user", displayName: "Чужое имя" }, { token })).status, 409);
  assert.equal((await post("profile", { accountId: user.id, displayName: "Новое имя", ai_chat: true }, { token })).status, 400);
  assert.equal((await post("profile", { accountId: user.id, displayName: "Новое имя", email: "other@gmail.com" }, { token })).status, 400);
  assert.equal((await post("change-email", { accountId: user.id, email: "other@gmail.com" }, { token })).status, 404);
  assert.equal(canUseAiChat(user.id), false);
  assert.equal(findSession(token)?.email, email);
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

test("login and recovery quotas isolate the address and network pair and honor the expiry", () => {
  const now = Date.now();
  for (const [action, count, expiry] of [["login", 6, 900_000], ["forgot", 3, 3_600_000]] as const) {
    for (let index = 0; index < count; index++) limitAccountRequests(action, "source-a", "owner@example.test", now);
    assert.throws(() => limitAccountRequests(action, "source-a", "owner@example.test", now), { status: 429 });
    assert.doesNotThrow(() => limitAccountRequests(action, "source-b", "owner@example.test", now));
    assert.doesNotThrow(() => limitAccountRequests(action, "source-a", "owner@example.test", now + expiry));
  }
});

test("a login declined by the password worker pool leaves account quotas unused", async () => {
  const work = [hashPassword(password), hashPassword(password)];
  try {
    const response = await login("busy@example.test");
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "2");
    assert.equal(accountDb().prepare("SELECT count(*) AS total FROM account_rate_limits WHERE bucket LIKE 'login:%'").get()?.total, 0);
  } finally {
    await Promise.all(work);
  }
});

test("registration acknowledges the same request before deferred delivery for new and active addresses", async () => {
  const email = "no-delivery@mail.ru";
  const active = "active-delivery@mail.ru";
  await activate(active);
  process.env.ACCOUNT_TEST_OUTBOX = directory;
  try {
    const results = [];
    const deferred: (() => Promise<void>)[] = [];
    for (const address of [email, active]) {
      const response = await handleAccountRequest(new Request(origin, {
        method: "POST", headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({ ...legalAcceptance, email: address, displayName: "София" }),
      }), "register", () => undefined, callback => deferred.push(callback));
      results.push([response.status, [...response.headers], await response.json()]);
    }
    assert.equal(results[0][0], 200);
    assert.deepEqual(results[0], results[1]);
    assert.equal(deferred.length, 2);
    assert.equal(accountDb().prepare("SELECT count(*) AS count FROM account_challenges WHERE email = ?").get(email)?.count, 0);
    await Promise.all(deferred.map(callback => callback()));
    assert.equal(accountDb().prepare("SELECT count(*) AS count FROM account_challenges WHERE email = ?").get(email)?.count, 1);
  } finally {
    process.env.ACCOUNT_TEST_OUTBOX = outbox;
  }
  assert.equal((await post("resend-verification", { email })).status, 200);
  assert.ok(await tokenFromMail(email, "verify"));
});

const smtpSettings = {
  ACCOUNT_MODE: "proxy", ACCOUNT_ORIGIN: "https://sophia.example.net", ACCOUNT_MAIL_TRANSPORT: "smtp",
  SMTP_HOST: "postbox.cloud.yandex.net", SMTP_PORT: "587", SMTP_USER: "fixture-user",
  SMTP_PASSWORD: "fixture-password", SMTP_FROM: "Sophia <accounts@example.net>",
};

async function withSmtpSettings(run: () => Promise<void>) {
  const previous = new Map(Object.keys(smtpSettings).map(key => [key, process.env[key]]));
  Object.assign(process.env, smtpSettings);
  try {
    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("sends both account templates through authenticated SMTP with mandatory STARTTLS", async ({ mock }) => {
  await withSmtpSettings(async () => {
    const smtp = mock.method(SMTPTransport.prototype, "send", function (
      this: SMTPTransport, ...[mail, callback]: Parameters<SMTPTransport["send"]>
    ) {
      assert.equal(this.options.host, smtpSettings.SMTP_HOST);
      assert.equal(this.options.port, 587);
      assert.equal(this.options.secure, false);
      assert.equal(this.options.requireTLS, true);
      assert.equal(this.options.tls?.rejectUnauthorized, true);
      assert.equal(this.options.tls?.minVersion, "TLSv1.2");
      assert.equal(this.options.logger, false);
      assert.equal(this.options.debug, false);
      assert.deepEqual(this.options.auth, { user: smtpSettings.SMTP_USER, pass: smtpSettings.SMTP_PASSWORD });
      const envelope = mail.message.getEnvelope();
      callback(null, {
        envelope, accepted: envelope.to, rejected: [], pending: [], response: "250 OK", messageId: "fixture",
        envelopeTime: 0, messageTime: 0, messageSize: 0,
      });
    });
    const send = accountMailTransport();
    const to = "recipient@example.net";
    for (const [kind, path] of [["verify", "/verify-email"], ["reset", "/reset-password"]] as const) {
      await send({ to, kind, url: `${smtpSettings.ACCOUNT_ORIGIN}${path}#token=fixture` });
    }
    assert.equal(smtp.mock.callCount(), 2);
    const [verify, reset] = smtp.mock.calls.map(call => call.arguments[0].data);
    assert.equal(verify.from, smtpSettings.SMTP_FROM);
    assert.deepEqual(smtp.mock.calls[0].arguments[0].message.getEnvelope().to, [to]);
    assert.equal(verify.subject, "Подтверди почту в Sophia");
    assert.equal(verify.text, "Перейди по ссылке, чтобы подтвердить почту и установить пароль. Ссылка действует в пределах 24 часов с момента подачи заявки.\nhttps://sophia.example.net/verify-email#token=fixture\n\nЕсли ты не отправлял этот запрос, просто проигнорируй письмо.");
    assert.equal(reset.subject, "Восстановление доступа к Sophia");
    assert.equal(reset.text, "Перейди по ссылке, чтобы установить новый пароль. Ссылка действует 30 минут.\nhttps://sophia.example.net/reset-password#token=fixture\n\nЕсли ты не отправлял этот запрос, просто проигнорируй письмо.");
  });
});

test("fails closed when SMTP credentials are missing or the port is not 587", async () => {
  await withSmtpSettings(async () => {
    delete process.env.SMTP_PASSWORD;
    assert.throws(accountMailTransport, { status: 503 });
    process.env.SMTP_PASSWORD = smtpSettings.SMTP_PASSWORD;
    process.env.SMTP_PORT = "465";
    assert.throws(accountMailTransport, { status: 503 });
  });
});

test("hides the SMTP server response when delivery fails", async ({ mock }) => {
  await withSmtpSettings(async () => {
    mock.method(SMTPTransport.prototype, "send", function (...[, callback]: Parameters<SMTPTransport["send"]>) {
      callback(new Error(`SMTP rejection: ${smtpSettings.SMTP_PASSWORD}`));
    });
    await assert.rejects(
      accountMailTransport()({ to: "recipient@example.net", kind: "verify", url: "https://sophia.example.net/verify-email" }),
      { message: "SMTP delivery failed" },
    );
  });
});

test("verifies SMTP with required authentication and exposes only safe error codes", async ({ mock }) => {
  await withSmtpSettings(async () => {
    const verify = mock.method(SMTPTransport.prototype, "verify", function (this: SMTPTransport) {
      assert.equal(this.options.forceAuth, true);
      assert.equal(this.options.requireTLS, true);
      assert.equal(this.options.tls?.rejectUnauthorized, true);
      if (verify.mock.callCount() === 0) return Promise.resolve(true as const);
      return Promise.reject(Object.assign(new Error(smtpSettings.SMTP_PASSWORD), {
        code: "EAUTH", response: `535 5.7.8 ${smtpSettings.SMTP_PASSWORD}`, responseCode: 535,
      }));
    });
    const email = createEmailService();
    assert.ok(email);
    await email.verify();
    await assert.rejects(email.verify(), error => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, "SMTP verification failed");
      assert.deepEqual({ ...error }, { code: "EAUTH", status: "535 5.7.8" });
      assert.equal(error.cause, undefined);
      return true;
    });
  });
});

test("fails closed without verified proxy headers and uses a host-only secure cookie over HTTPS", async () => {
  const email = "proxy@mail.ru";
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
  const email = "hashes@mail.ru";
  const db = accountDb();
  await post("register", { ...legalAcceptance, email, displayName: "София" });
  const token = await tokenFromMail(email, "verify");
  const challenge = db.prepare("SELECT token_hash FROM account_challenges WHERE email = ?").get(email);
  assert.match(String(challenge?.token_hash), /^[a-f\d]{64}$/);
  await post("verify", { ...legalAcceptance, token, ...pair });
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
  const email = "expired@mail.ru";
  await post("register", { ...legalAcceptance, email, displayName: "София" });
  const token = await tokenFromMail(email, "verify");
  assert.equal((await post("reset", { token, ...pair })).status, 400);
  accountDb().prepare("UPDATE account_challenges SET expires_at = 1 WHERE email = ?").run(email);
  assert.equal((await post("verify", { ...legalAcceptance, token, ...pair })).status, 400);
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
  const email = "entitled@mail.ru";
  const cli = (...args: string[]) => spawnSync(process.execPath, ["scripts/accounts/cli.ts", ...args], { encoding: "utf8" });
  const migration = cli("migrate");
  assert.equal(migration.status, 0, migration.stderr);
  assert.match(migration.stdout, /schema 7/);
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
