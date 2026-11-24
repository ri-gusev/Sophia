import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { KnowledgeStore } from "../knowledge/knowledge-store.ts";
import { EMPTY_CHAT_MEMORY } from "../../src/features/philosopher-conversation/chat-contract.ts";
import { readChatResponse } from "../../src/features/philosopher-conversation/chat-stream.ts";
import { ragConfig } from "../../src/features/philosopher-conversation/server/rag/config.ts";
import { indexKnowledge } from "../../src/features/philosopher-conversation/server/rag/index-store.ts";

const proxyOrigin = "https://sophia.example";
const proxyToken = "ab".repeat(32);
const password = "Синтетическая парольная фраза для теста";
const ragEnvironment = {
  PLATO_RAG_ENABLED: "true", PLATO_VALIDATION_ENABLED: "true", PLATO_HISTORICAL_MODE: "true",
  OPENAI_EMBEDDING_MODEL: "text-embedding-3-small", PLATO_EMBEDDING_DIMENSIONS: "256",
  PLATO_CHUNK_SIZE: "800", PLATO_CHUNK_OVERLAP: "200", PLATO_CONTEXT_CHARS: "18000",
  PLATO_RETRIEVAL_THRESHOLD: "0.25", PLATO_VECTOR_TOP_K: "12", PLATO_KEYWORD_TOP_K: "12", PLATO_FINAL_CONTEXT_K: "6",
};

async function freePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((done, fail) => probe.close(error => error ? fail(error) : done()));
  return address.port;
}

async function waitFor(check: () => boolean | Promise<boolean>, description: string, timeout = 7000) {
  const deadline = Date.now() + timeout;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}`);
    await delay(40);
  }
}

test("the production chat route gates paid work and keeps proxy quotas, SSE, billing and cancellation", { timeout: 45000 }, async t => {
  assert.ok(existsSync(".next/BUILD_ID"), "Run the production build before the chat route integration test.");
  const root = resolve(".");
  const directory = mkdtempSync(join(tmpdir(), "sophia-chat-route-"));
  const links: string[] = [];
  const cleanup: { stop?: () => Promise<void> } = {};
  t.after(async () => {
    try { await cleanup.stop?.(); } finally {
      for (const link of links) unlinkSync(link);
      rmSync(directory, { recursive: true, force: true });
    }
  });
  for (const name of [".next", "node_modules"]) {
    const link = join(directory, name);
    symlinkSync(join(root, name), link, "junction");
    links.push(link);
  }
  for (const name of ["next.config.ts", "package.json"]) copyFileSync(join(root, name), join(directory, name));
  const accountDb = join(directory, "accounts.sqlite");
  const outbox = join(directory, "outbox.jsonl");
  const ledger = join(directory, "ledger.sqlite");
  const providerLog = join(directory, "provider.log");
  writeFileSync(ledger, "");
  writeFileSync(providerLog, "");
  const calls = () => readFileSync(providerLog, "utf8").trim().split("\n").filter(Boolean);

  const source = join(directory, "test-corpus.md");
  writeFileSync(source, "# Справедливость\n\nСинтетический материал для проверки поиска по вектору.");
  const corpus = new KnowledgeStore(join(directory, "storage", "knowledge"));
  try {
    corpus.importFile({
      filePath: source, documentId: "synthetic", title: "Синтетический материал",
      philosophers: [{ id: "plato", name: "Платон" }],
    });
    await indexKnowledge(corpus.databasePath, ragConfig(ragEnvironment), async texts => texts.map(() => [1, ...Array(255).fill(0)]));
  } finally { corpus.close(); }

  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const accountEnvironment = {
    ACCOUNT_MODE: "local", ACCOUNT_ORIGIN: origin, ACCOUNT_DB_PATH: accountDb,
    ACCOUNT_MAIL_TRANSPORT: "test", ACCOUNT_TEST_OUTBOX: outbox, RESEND_API_KEY: "",
    NODE_ENV: "production", NODE_OPTIONS: "", CHAT_LEDGER_PATH: ledger,
  } satisfies NodeJS.ProcessEnv;
  const launch = spawn(process.execPath, [
    "--import", pathToFileURL(join(root, "scripts/chat/fake-openai.mjs")).href, join(root, "node_modules/next/dist/bin/next"),
    "start", "--hostname", "127.0.0.1", "--port", String(port),
  ], {
    cwd: directory,
    env: {
      ...process.env, ...ragEnvironment, ...accountEnvironment,
      CHAT_ACCESS_MODE: "proxy", CHAT_ALLOWED_ORIGINS: proxyOrigin, CHAT_PROXY_SECRET: proxyToken,
      CHAT_GLOBAL_PER_MINUTE: "20", CHAT_GLOBAL_CONCURRENT: "2", CHAT_PAID_CONCURRENT: "2",
      CHAT_CLIENT_PER_MINUTE: "5", CHAT_CLIENT_PER_DAY: "40", CHAT_CLIENT_CONCURRENT: "1", CHAT_CLIENT_BURST: "1",
      CHAT_MAX_TURN_USD: "1.85", CHAT_DAY_BUDGET_USD: "2.18", CHAT_MONTH_BUDGET_USD: "2.18",
      OPENAI_API_KEY: "synthetic-sophia-route-test", OPENAI_MODEL: "gpt-5.4-mini",
      SOPHIA_FAKE_OPENAI_CALL_LOG: providerLog,
    },
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  let serverLog = "";
  const log = (data: Buffer) => { serverLog = (serverLog + data).slice(-8000); };
  launch.stdout.on("data", log);
  launch.stderr.on("data", log);
  const exited = once(launch, "exit");
  // Attach a handler immediately in case startup fails before teardown.
  void exited.catch(() => {});
  cleanup.stop = async () => {
    launch.kill();
    await exited;
  };
  try {
    await waitFor(async () => {
      if (launch.exitCode !== null) throw new Error("Production test server exited");
      const response = await fetch(origin, { signal: AbortSignal.timeout(500) }).catch(() => null);
      await response?.body?.cancel();
      return response?.ok ?? false;
    }, "the production server");
  } catch (error) { throw new Error(serverLog, { cause: error }); }

  function account(action: string, data: object, cookie?: string) {
    return fetch(`${origin}/api/account/${action}`, {
      method: "POST", signal: AbortSignal.timeout(5000), headers: {
        origin, "content-type": "application/json", ...(cookie ? { cookie } : {}),
      }, body: JSON.stringify(data),
    });
  }
  function chat(ip: string, options: {
    cookie?: string; scope?: string; body?: object; proxy?: string; signal?: AbortSignal;
  } = {}) {
    return fetch(`${origin}/api/philosopher-chat`, {
      method: "POST", signal: options.signal ?? AbortSignal.timeout(5000), headers: {
        origin: proxyOrigin, "content-type": "application/json", accept: "text/event-stream",
        "x-sophia-client-ip": ip, "x-sophia-proxy-token": options.proxy ?? proxyToken,
        ...(options.cookie ? { cookie: options.cookie } : {}),
        ...(options.scope ? { "x-sophia-chat-scope": options.scope } : {}),
      }, body: JSON.stringify({ philosopherId: "plato", message: "Что такое справедливость?", memory: EMPTY_CHAT_MEMORY, ...options.body }),
    });
  }
  const accountData = { email: "chat-route@example.test", displayName: "Читатель", password, confirmPassword: password };
  const firstNetwork = "192.0.2.1";
  const denied = await chat(firstNetwork, { body: { isPremium: true, role: "admin", userId: "somebody" } });
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get("cache-control"), "no-store");
  assert.equal((await account("register", accountData)).status, 200);
  assert.equal((await account("login", { email: accountData.email, password })).status, 401);
  assert.equal((await chat(firstNetwork)).status, 401);

  await waitFor(() => existsSync(outbox), "the verification message");
  const letter = JSON.parse(readFileSync(outbox, "utf8").trim());
  const token = new URLSearchParams(new URL(letter.url).hash.slice(1)).get("token");
  assert.ok(token);
  assert.equal((await account("verify", { token, password, confirmPassword: password })).status, 200);
  const login = await account("login", { email: accountData.email, password });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);

  const db = new DatabaseSync(accountDb, { timeout: 250 });
  let accountId: string;
  try {
    const row = db.prepare("SELECT id FROM account_users WHERE email = ?").get(accountData.email);
    assert.equal(typeof row?.id, "string");
    accountId = String(row?.id);
    const forged = await chat(firstNetwork, { cookie, scope: accountId, body: { isPremium: true, role: "admin", userId: accountId } });
    assert.equal(forged.status, 403);
    assert.equal((await account("profile", { displayName: "Читатель", userId: accountId, ai_chat: true }, cookie)).status, 400);
    assert.equal((await chat(firstNetwork, { cookie })).status, 403);
    assert.deepEqual(calls(), []);
    assert.equal(db.prepare("SELECT count(*) AS count FROM account_entitlements").get()?.count, 0);
  } finally { db.close(); }
  function setEntitlement(operation: "grant-ai-chat" | "revoke-ai-chat") {
    const result = spawnSync(process.execPath, ["scripts/accounts/cli.ts", operation, accountData.email], {
      cwd: root, env: { ...process.env, ...accountEnvironment }, encoding: "utf8", timeout: 5000, windowsHide: true,
    });
    assert.equal(result.status, 0, result.stderr);
  }
  setEntitlement("grant-ai-chat");

  assert.equal((await chat(firstNetwork, { cookie, scope: "stale-tab" })).status, 403);
  assert.equal((await chat(firstNetwork, { cookie, proxy: "untrusted" })).status, 503);
  assert.equal((await chat("192.0.2.9", { cookie, body: { philosopherId: "aristotle" } })).status, 400);
  assert.deepEqual(calls(), []);

  const answer = await chat(firstNetwork, { cookie, scope: accountId });
  assert.equal(answer.status, 200, `Production chat failed: ${await (answer.ok ? Promise.resolve("") : answer.text())}\n${serverLog}`);
  assert.match(answer.headers.get("content-type") ?? "", /^text\/event-stream/);
  const reply = await readChatResponse(answer, () => {});
  assert.equal(reply.message, "Рассмотрим, почему равное обращение не всегда означает справедливость.");
  assert.deepEqual(calls(), ["turn_analysis", "embedding", "plato_draft", "grounding_validation"]);

  function charges() {
    const reader = new DatabaseSync(ledger, { readOnly: true, timeout: 250 });
    try {
      return reader.prepare("SELECT spent, attempts, active_until FROM chat_spend ORDER BY rowid").all().map(row => ({ ...row }));
    } finally { reader.close(); }
  }
  assert.deepEqual(charges(), [{ spent: 36_002_000, attempts: 4, active_until: 0 }]);
  const rateLimited = await chat(firstNetwork, { cookie, scope: accountId });
  assert.equal(rateLimited.status, 429);
  assert.ok(Number(rateLimited.headers.get("retry-after")) > 0);

  const controller = new AbortController();
  const cancelled = chat("192.0.2.2", { cookie, body: { message: "Отмена тестового ответа" }, signal: controller.signal });
  const rejection = assert.rejects(cancelled, { name: "AbortError" });
  await waitFor(() => calls().length === 5, "the second turn to reach the fake provider");
  controller.abort();
  await rejection;
  await waitFor(() => calls().at(-1) === "aborted" && charges()[1]?.spent === 309_000_000, "provider abort and cost settlement");
  assert.ok(Number(charges()[1].active_until) > 0);

  const budgetLimited = await chat("192.0.2.3", { cookie });
  assert.equal(budgetLimited.status, 503);
  assert.match(await budgetLimited.text(), /Лимит расходов/);
  setEntitlement("revoke-ai-chat");
  assert.equal((await chat("192.0.2.4", { cookie })).status, 403);
  assert.deepEqual(calls(), ["turn_analysis", "embedding", "plato_draft", "grounding_validation", "turn_analysis", "aborted"]);

  await t.test("a session database error keeps private pages and learning writes away from the guest scope", async () => {
    const fault = new DatabaseSync(accountDb, { timeout: 250 });
    try {
      fault.exec("ALTER TABLE account_sessions RENAME TO unavailable_sessions");
      const headers = { cookie };
      const [profile, learn, progress] = await Promise.all([
        fetch(`${origin}/profile`, { headers, redirect: "manual" }),
        fetch(`${origin}/learn`, { headers }),
        fetch(`${origin}/api/progress`, { headers }),
      ]);
      assert.equal(profile.status, 200);
      assert.match(await profile.text(), /Профиль временно недоступен/);
      assert.equal(learn.status, 200);
      assert.match(await learn.text(), /sessionUnavailable.{0,4}true/);
      assert.equal(progress.status, 503);
      await progress.body?.cancel();
      assert.equal((await fetch(`${origin}/api/progress`)).status, 401);
    } finally {
      fault.exec("ALTER TABLE unavailable_sessions RENAME TO account_sessions");
      fault.close();
    }
  });
});
