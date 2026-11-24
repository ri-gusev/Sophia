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

test("the production chat route gates paid work and keeps quotas, SSE, billing and cancellation", { timeout: 45000 }, async t => {
  assert.ok(existsSync(".next/BUILD_ID"), "Run the production build before the chat route integration test.");
  const root = resolve(".");
  const directory = mkdtempSync(join(tmpdir(), "sophia-chat-route-"));
  const links: string[] = [];
  const stops: (() => Promise<void>)[] = [];
  t.after(async () => {
    try { await Promise.all(stops.map(stop => stop())); } finally {
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
  const calls = () => readFileSync(providerLog, "utf8").trim().split("\n").filter(event => event && event !== "request");

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

  const accountEnvironment = {
    ACCOUNT_MODE: "local", ACCOUNT_DB_PATH: accountDb,
    ACCOUNT_MAIL_TRANSPORT: "test", ACCOUNT_TEST_OUTBOX: outbox, SMTP_USER: "", SMTP_PASSWORD: "",
    NODE_ENV: "production", NODE_OPTIONS: "", CHAT_LEDGER_PATH: ledger,
  } satisfies NodeJS.ProcessEnv;
  async function startChatServer(overrides: Partial<NodeJS.ProcessEnv>) {
    const port = await freePort();
    const origin = `http://127.0.0.1:${port}`;
    const env: NodeJS.ProcessEnv = {
      ...process.env, ...ragEnvironment, ...accountEnvironment, ACCOUNT_ORIGIN: origin,
      CHAT_ACCESS_MODE: "local", CHAT_ALLOWED_ORIGINS: origin, CHAT_PROXY_SECRET: proxyToken,
      CHAT_GLOBAL_PER_MINUTE: "20", CHAT_GLOBAL_CONCURRENT: "2", CHAT_PAID_CONCURRENT: "2",
      CHAT_CLIENT_PER_MINUTE: "5", CHAT_CLIENT_PER_DAY: "40", CHAT_CLIENT_CONCURRENT: "1", CHAT_CLIENT_BURST: "4",
      CHAT_MAX_TURN_USD: "1.85", CHAT_DAY_BUDGET_USD: "2.18", CHAT_MONTH_BUDGET_USD: "2.18",
      OPENAI_API_KEY: "synthetic-sophia-route-test", OPENAI_MODEL: "gpt-5.4-mini",
      SOPHIA_FAKE_OPENAI_CALL_LOG: providerLog, ...overrides,
    };
    if (overrides.AI_CHAT_ENABLED === undefined) delete env.AI_CHAT_ENABLED;
    const launch = spawn(process.execPath, [
      "--import", pathToFileURL(join(root, "scripts/chat/fake-openai.mjs")).href, join(root, "node_modules/next/dist/bin/next"),
      "start", "--hostname", "127.0.0.1", "--port", String(port),
    ], { cwd: directory, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let serverLog = "";
    const log = (data: Buffer) => { serverLog = (serverLog + data).slice(-8000); };
    launch.stdout.on("data", log);
    launch.stderr.on("data", log);
    const exited = once(launch, "exit");
    void exited.catch(() => {});
    stops.push(async () => { launch.kill(); await exited; });
    try {
      await waitFor(async () => {
        if (launch.exitCode !== null) throw new Error("Production test server exited");
        const response = await fetch(origin, { signal: AbortSignal.timeout(500) }).catch(() => null);
        await response?.body?.cancel();
        return response?.ok ?? false;
      }, "the production server");
    } catch (error) { throw new Error(serverLog, { cause: error }); }
    return { origin, serverLog: () => serverLog };
  }
  const { origin, serverLog } = await startChatServer({ AI_CHAT_ENABLED: "true" });

  function account(action: string, data: object, cookie?: string) {
    return fetch(`${origin}/api/account/${action}`, {
      method: "POST", signal: AbortSignal.timeout(5000), headers: {
        origin, "content-type": "application/json", ...(cookie ? { cookie } : {}),
      }, body: JSON.stringify(data),
    });
  }
  function chat(options: {
    cookie?: string; scope?: string; body?: object; signal?: AbortSignal;
  } = {}) {
    return fetch(`${origin}/api/philosopher-chat`, {
      method: "POST", signal: options.signal ?? AbortSignal.timeout(5000), headers: {
        origin, "content-type": "application/json", accept: "text/event-stream",
        ...(options.cookie ? { cookie: options.cookie } : {}),
        ...(options.scope ? { "x-sophia-chat-scope": options.scope } : {}),
      }, body: JSON.stringify({ philosopherId: "plato", message: "Что такое справедливость?", memory: EMPTY_CHAT_MEMORY, ...options.body }),
    });
  }
  const accountData = { email: "chat-route@example.test", displayName: "Читатель", password, confirmPassword: password };
  const denied = await chat({ body: { isPremium: true, role: "admin", userId: "somebody" } });
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get("cache-control"), "no-store");
  assert.equal((await account("register", accountData)).status, 200);
  assert.equal((await account("login", { email: accountData.email, password })).status, 401);
  assert.equal((await chat()).status, 401);

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
    const forged = await chat({ cookie, scope: accountId, body: { isPremium: true, role: "admin", userId: accountId } });
    assert.equal(forged.status, 403);
    assert.equal((await account("profile", { displayName: "Читатель", userId: accountId, ai_chat: true }, cookie)).status, 400);
    assert.equal((await chat({ cookie })).status, 403);
    assert.deepEqual(calls(), []);
    assert.equal(db.prepare("SELECT count(*) AS count FROM account_entitlements").get()?.count, 0);
  } finally { db.close(); }
  function setEntitlement(operation: "grant-ai-chat" | "revoke-ai-chat") {
    const result = spawnSync(process.execPath, ["scripts/accounts/cli.ts", operation, accountData.email], {
      cwd: root, env: { ...process.env, ...accountEnvironment, ACCOUNT_ORIGIN: origin }, encoding: "utf8", timeout: 5000, windowsHide: true,
    });
    assert.equal(result.status, 0, result.stderr);
  }
  setEntitlement("grant-ai-chat");

  const disabledConfigurations = [
    { label: "explicit false", value: "false", mode: "local" },
    { label: "missing flag", value: undefined, mode: "local" },
    { label: "invalid flag", value: "TRUE", mode: "local" },
    { label: "proxy mode even with true", value: "true", mode: "proxy" },
  ];
  for (const { label, value, mode } of disabledConfigurations) {
    await t.test(`no OpenAI requests or ledger use with ${label}`, async () => {
      const ledgerPath = join(directory, `disabled-${mode}-${value ?? "missing"}.sqlite`);
      if (mode === "proxy") writeFileSync(ledgerPath, "");
      const { origin: disabledOrigin } = await startChatServer({
        AI_CHAT_ENABLED: value, CHAT_ACCESS_MODE: mode, CHAT_LEDGER_PATH: ledgerPath,
        ...(mode === "proxy" ? { CHAT_ALLOWED_ORIGINS: proxyOrigin } : {}),
      });
      const disabledUrl = `${disabledOrigin}/api/philosopher-chat?AI_CHAT_ENABLED=true`;
      const assertedResponse = { error: "Разговор временно недоступен. Попробуйте позже." };
      const requestHeaders: Record<string, string>[] = [
        { origin: mode === "proxy" ? proxyOrigin : disabledOrigin, cookie, "x-sophia-chat-scope": accountId,
          "x-sophia-proxy-token": proxyToken, "x-sophia-client-ip": "192.0.2.1", "x-ai-chat-enabled": "true" },
        {},
      ];
      for (const headers of requestHeaders) {
        const response = await fetch(disabledUrl, {
          method: "POST", signal: AbortSignal.timeout(5000),
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({ philosopherId: "plato", message: "Что такое справедливость?", memory: EMPTY_CHAT_MEMORY, aiChatEnabled: true }),
        });
        assert.equal(response.status, 503);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(await response.json(), assertedResponse);
      }
      assert.equal(readFileSync(providerLog, "utf8"), "");
      if (mode === "proxy") assert.equal(readFileSync(ledgerPath).length, 0);
      else assert.equal(existsSync(ledgerPath), false);
    });
  }

  assert.equal((await chat({ cookie, scope: "stale-tab" })).status, 403);
  assert.equal((await chat({ cookie, body: { philosopherId: "aristotle" } })).status, 400);
  assert.deepEqual(calls(), []);

  const answer = await chat({ cookie, scope: accountId });
  assert.equal(answer.status, 200, `Production chat failed: ${await (answer.ok ? Promise.resolve("") : answer.text())}\n${serverLog()}`);
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
  const controller = new AbortController();
  const cancelled = chat({ cookie, body: { message: "Отмена тестового ответа" }, signal: controller.signal });
  const rejection = assert.rejects(cancelled, { name: "AbortError" });
  await waitFor(() => calls().length === 5, "the second turn to reach the fake provider");
  const rateLimited = await chat({ cookie, scope: accountId });
  assert.equal(rateLimited.status, 429);
  assert.ok(Number(rateLimited.headers.get("retry-after")) > 0);
  controller.abort();
  await rejection;
  await waitFor(() => calls().at(-1) === "aborted" && charges()[1]?.spent === 309_000_000, "provider abort and cost settlement");
  assert.ok(Number(charges()[1].active_until) > 0);
  // Local mode shares one client identity. Advance the settled lease past expiry to test the budget independently.
  const ledgerWriter = new DatabaseSync(ledger, { timeout: 250 });
  try {
    await waitFor(() => ledgerWriter.prepare("SELECT count(*) AS count FROM chat_requests WHERE active_until > 0").get()?.count === 0,
      "the cancelled HTTP slot to be released");
    ledgerWriter.prepare("UPDATE chat_spend SET active_until = 0 WHERE active_until > 0").run();
  } finally { ledgerWriter.close(); }

  const budgetLimited = await chat({ cookie });
  assert.equal(budgetLimited.status, 503);
  assert.match(await budgetLimited.text(), /Лимит расходов/);
  setEntitlement("revoke-ai-chat");
  assert.equal((await chat({ cookie })).status, 403);
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
