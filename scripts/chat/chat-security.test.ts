import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { spawn } from "node:child_process";
import { CHAT_LIMITS, ChatError, EMPTY_CHAT_MEMORY } from "../../src/features/philosopher-conversation/chat-contract.ts";
import { chatSettings, proxyClient } from "../../src/features/philosopher-conversation/server/chat-access.ts";
import { createChatLedger, type ChatLimits } from "../../src/features/philosopher-conversation/server/chat-ledger.ts";
import { createChatHandler } from "../../src/features/philosopher-conversation/server/chat-http.ts";
import { chatModel, withChatBudget } from "../../src/features/philosopher-conversation/server/chat-billing.ts";
import { createOpenAITextGenerator, type GenerationRequest } from "../../src/features/philosopher-conversation/server/openai-provider.ts";
import { createEmbedder } from "../../src/features/philosopher-conversation/server/rag/embeddings.ts";

const second = 1000;
const day = 86_400_000;
const secret = "0".repeat(64);
const origin = "https://sophia.example";
const config = { enabled: true, validation: true, embeddingModel: "text-embedding-3-small" };
const fullTurn = 1_848_988_840;
const defaults: ChatLimits = {
  globalMinute: 20, globalActive: 2, clientMinute: 3, clientDay: 7, clientBurst: 2,
  clientActive: 1, paidActive: 2, turn: 1_850_000_000, day: 5_000_000_000, month: 10_000_000_000,
};

function fixture(t: TestContext, overrides: Partial<ChatLimits> = {}) {
  const directory = mkdtempSync(join(tmpdir(), "sophia-chat-"));
  const path = join(directory, "ledger.sqlite");
  writeFileSync(path, "");
  const limits = { ...defaults, ...overrides };
  let time = Date.UTC(2026, 10, 24);
  const ledgers: ReturnType<typeof createChatLedger>[] = [];
  const reopen = () => {
    const ledger = createChatLedger(path, limits, () => time);
    ledgers.push(ledger);
    return ledger;
  };
  t.after(() => {
    for (const ledger of ledgers) ledger.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { path, limits, reopen, ledger: reopen(), advance: (delta: number) => { time += delta; }, now: () => time };
}

function expectStatus(status: number, retryAfter?: number) {
  return (error: unknown) => error instanceof ChatError && error.status === status && error.retryAfter === retryAfter;
}

test("proxy identity requires a trusted token and groups tabs, IPv6 networks and IPv4-mapped addresses", () => {
  const headers = (ip: string, forwarded = "198.51.100.127") => new Headers({
    "x-sophia-proxy-token": secret, "x-sophia-client-ip": ip, "x-forwarded-for": forwarded,
  });
  assert.throws(() => proxyClient(new Headers({ "x-forwarded-for": "192.0.2.1", "x-sophia-client-ip": "192.0.2.1" }), secret), expectStatus(503));
  assert.throws(() => proxyClient(headers("192.0.2.1, 192.0.2.2"), secret), expectStatus(503));
  assert.equal(proxyClient(headers("192.0.2.1"), secret), proxyClient(headers("::ffff:192.0.2.1", "192.0.2.2"), secret));
  assert.equal(proxyClient(headers("2001:0DB8:1::1"), secret), proxyClient(headers("2001:db8:1::2"), secret));
  assert.notEqual(proxyClient(headers("192.0.2.1"), secret), proxyClient(headers("192.0.2.2"), secret));
  assert.throws(() => chatSettings({}), expectStatus(503));
  assert.throws(() => chatSettings({ CHAT_ACCESS_MODE: "local", CHAT_ALLOWED_ORIGINS: origin }), expectStatus(503));
});

test("shared rate quotas enforce burst, minute, UTC day, concurrency and restart", t => {
  const { ledger, reopen, advance } = fixture(t, { clientDay: 4 });
  const release = ledger.admit("first-client");
  assert.throws(() => ledger.admit("first-client"), expectStatus(429, 120));
  const secondClient = reopen().admit("second-client");
  assert.throws(() => ledger.admit("third-client"), expectStatus(429, 120));
  release(); release(); secondClient();
  ledger.admit("first-client")();
  assert.throws(() => ledger.admit("first-client"), expectStatus(429, 5));
  advance(5 * second);
  ledger.admit("first-client")();
  assert.throws(() => ledger.admit("first-client"), expectStatus(429, 55));
  advance(55 * second);
  ledger.close();
  const restarted = reopen();
  restarted.admit("first-client")();
  assert.throws(() => restarted.admit("first-client"), expectStatus(429, 86_340));
  advance(day - 60 * second);
  restarted.admit("first-client")();
});

test("the global rolling minute spans clients", t => {
  const { ledger, advance } = fixture(t, { globalMinute: 2, clientMinute: 1, clientBurst: 1 });
  ledger.admit("a")();
  ledger.admit("b")();
  assert.throws(() => ledger.admit("c"), expectStatus(429, 60));
  advance(60 * second);
  ledger.admit("c")();
});

test("missing storage fails closed before paid work and does not create a replacement", async t => {
  const { path, limits } = fixture(t);
  const ledger = createChatLedger(path + ".missing", limits);
  let paid = 0;
  const handler = createChatHandler({ access: () => ({
    originSet: new Set([origin]), identify: () => "client", admit: ledger.admit,
  }), answer: async () => { paid++; throw new Error("must not run"); } });
  assert.equal((await handler(request())).status, 503);
  assert.equal(paid, 0);
  assert.throws(() => ledger.reserve("client", fullTurn), expectStatus(503));
  assert.equal(existsSync(path + ".missing"), false);
  ledger.close();
});

const payload = JSON.stringify({ philosopherId: "plato", message: "Тестовый вопрос", memory: EMPTY_CHAT_MEMORY });
function request(body: BodyInit = payload, headers: Record<string, string> = {}, signal?: AbortSignal) {
  const options = { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body, signal, duplex: "half" };
  return new Request("http://127.0.0.1/api/philosopher-chat", options);
}

test("HTTP handles cheap rejects, mismatched lengths, invalid JSON, slow body and disconnect", async () => {
  let admissions = 0, releases = 0, answers = 0, cancels = 0;
  const handler = createChatHandler({
    access: () => ({ originSet: new Set([origin]), identify: () => "test", admit: () => { admissions++; return () => { releases++; }; } }),
    answer: async ({ memory }) => { answers++; return { message: "Answer", memory, sources: [] }; }, bodyTimeoutMs: 20,
  });
  const missingOrigin = request();
  missingOrigin.headers.delete("origin");
  assert.equal((await handler(missingOrigin)).status, 403);
  assert.equal((await handler(request(payload, { origin: "https://other.example", host: "other.example", "x-forwarded-host": "other.example" }))).status, 403);
  assert.equal((await handler(request(payload, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await handler(request(payload, { "content-length": String(CHAT_LIMITS.bodyBytes + 1) }))).status, 413);
  assert.equal((await handler(request(payload, { "content-length": "1, 1" }))).status, 400);
  assert.equal(admissions, 0);
  assert.equal((await handler(request("{"))).status, 400);
  assert.equal((await handler(request(payload, { "content-length": "1" }))).status, 400);
  assert.equal((await handler(request("x".repeat(CHAT_LIMITS.bodyBytes + 1), { "content-length": "1" }))).status, 413);
  const hold = setTimeout(() => {}, 1000);
  try {
    const slow = () => new ReadableStream<Uint8Array>({ cancel() { cancels++; return new Promise(() => {}); } });
    assert.equal((await handler(request(slow()))).status, 400);
    const controller = new AbortController();
    const pending = handler(request(slow(), {}, controller.signal));
    controller.abort();
    assert.equal((await pending).status, 499);
    assert.equal(cancels, 2);
  } finally { clearTimeout(hold); }
  assert.equal(answers, 0);
  const response = await handler(request(payload, { accept: "text/event-stream" }));
  assert.match(response.headers.get("content-type") ?? "", /^text\/event-stream/);
  assert.match(await response.text(), /Answer/);
  assert.equal(answers, 1);
  assert.equal(releases, admissions);
});

test("only one of two processes can reserve the remaining budget", async t => {
  const { path, ledger, limits, now } = fixture(t, { day: fullTurn, month: fullTurn });
  ledger.admit("warmup")();
  const moduleUrl = new URL("../../src/features/philosopher-conversation/server/chat-ledger.ts", import.meta.url).href;
  const script = `
    import { createChatLedger } from ${JSON.stringify(moduleUrl)};
    const [path, client] = process.argv.slice(1);
    const ledger = createChatLedger(path, ${JSON.stringify(limits)}, () => ${now()});
    try { ledger.reserve(client, ${fullTurn}); process.exitCode = 0; }
    catch (error) { process.exitCode = error.status === 503 && /расходов/.test(error.message) ? 3 : 4; }
    finally { ledger.close(); }
  `;
  const worker = (name: string) => new Promise<number | null>((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", script, path, name], { stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", resolve);
  });
  assert.deepEqual((await Promise.all([worker("a"), worker("b")])).sort(), [0, 3]);
});

test("paid slots and reservations persist across restart, expire conservatively, and reset in UTC", t => {
  const { ledger, reopen, advance } = fixture(t, { day: fullTurn * 2, month: fullTurn * 2 });
  ledger.reserve("a", fullTurn).startOperation();
  const second = ledger.reserve("b", fullTurn);
  second.startOperation();
  ledger.close();
  const restarted = reopen();
  assert.throws(() => restarted.reserve("a", fullTurn), expectStatus(429, 420));
  assert.throws(() => restarted.reserve("c", fullTurn), expectStatus(429, 420));
  advance(421 * 1000);
  assert.throws(() => restarted.reserve("c", fullTurn), expectStatus(503));
  advance(day);
  assert.throws(() => restarted.reserve("c", fullTurn), expectStatus(503));
  advance(day * 7);
  restarted.reserve("c", fullTurn).settle(0, false);
});

test("a live reservation still occupies the daily and monthly budgets across midnight UTC", t => {
  const { ledger, advance } = fixture(t, { day: fullTurn + 100, month: fullTurn + 100 });
  advance(day * 7 - 1000);
  const first = ledger.reserve("a", fullTurn);
  advance(2000);
  assert.throws(() => ledger.reserve("b", fullTurn), expectStatus(503));
  first.settle(100, false);
  ledger.reserve("b", fullTurn).settle(0, false);
});

const analysis: GenerationRequest = { instructions: "", input: [{ role: "user", content: "test" }], maxOutputTokens: 2000, format: { name: "turn_analysis", schema: {} } };

function charges(path: string) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    return db.prepare("SELECT spent, reserved, attempts, active_until FROM chat_spend ORDER BY rowid").all().map(row => ({ ...row }));
  } finally { db.close(); }
}

test("bills reported text and embedding usage; an unknown provider failure charges its maximum", async t => {
  const { ledger, path } = fixture(t);
  const budget = withChatBudget(chatModel, config, amount => ledger.reserve("client", amount));
  const generate = async (stage: GenerationRequest, response: () => Promise<Response>) => budget.generate(stage, onUsage =>
    createOpenAITextGenerator({ model: chatModel, apiKey: "synthetic", fetcher: response, onUsage })(stage));
  assert.equal(await generate(analysis, async () => Response.json({ status: "completed", usage: { input_tokens: 100, output_tokens: 10, input_tokens_details: { cached_tokens: 10 } },
    output: [{ type: "message", content: [{ type: "output_text", text: "synthetic" }] }] })), "synthetic");
  const vectors = await budget.embed(undefined, onUsage => createEmbedder({ embeddingModel: config.embeddingModel, dimensions: 2 }, "synthetic",
    async () => Response.json({ usage: { prompt_tokens: 100 }, data: [{ index: 0, embedding: [1, 0] }] }), onUsage)(["test"]));
  assert.deepEqual(vectors, [[1, 0]]);
  await assert.rejects(generate({ ...analysis, maxOutputTokens: 1800, format: { name: "plato_draft", schema: {} } }, async () => { throw new Error("secret provider details"); }), expectStatus(504));
  budget.settle();
  const [row] = charges(path);
  assert.equal(row.reserved, fullTurn);
  assert.equal(row.attempts, 3);
  assert.equal(row.spent, 90 * 750 + 10 * 75 + 10 * 4500 + 100 * 20 + 400_000 * 750 + 1800 * 4500);
  assert.throws(() => ledger.reserve("client", fullTurn), expectStatus(429, 420));
});

test("successful missing usage charges the operation ceiling; cancellation during fetch is also billed", async t => {
  const { ledger, path } = fixture(t);
  const missing = withChatBudget(chatModel, config, amount => ledger.reserve("missing", amount));
  await missing.generate(analysis, async () => "synthetic");
  missing.settle();
  const controller = new AbortController();
  const stage = { ...analysis, signal: controller.signal };
  const cancelled = withChatBudget(chatModel, config, amount => ledger.reserve("cancelled", amount));
  await assert.rejects(cancelled.generate(stage, onUsage => createOpenAITextGenerator({ apiKey: "synthetic", model: chatModel, onUsage, fetcher: async () => {
    controller.abort();
    throw new Error("aborted");
  } })(stage)), expectStatus(499));
  cancelled.settle();
  const [success, failure] = charges(path);
  assert.equal(success.spent, 309_000_000);
  assert.equal(success.active_until, 0);
  assert.equal(failure.spent, 309_000_000);
  assert.ok(Number(failure.active_until) > 0);
});

test("limits fail before a provider invocation when the per-turn budget or operation allowance is insufficient", async t => {
  const { ledger } = fixture(t, { turn: fullTurn - 1 });
  assert.throws(() => withChatBudget(chatModel, config, amount => ledger.reserve("limited", amount)), expectStatus(503));
  const budget = withChatBudget(chatModel, { ...config, validation: false }, amount => ledger.reserve("limited", amount));
  let calls = 0;
  const invoke = async () => { calls++; };
  await budget.generate(analysis, invoke);
  await assert.rejects(budget.generate(analysis, invoke), expectStatus(503));
  assert.equal(calls, 1);
  budget.settle();
});

test("storage failure after reservation blocks the next provider call", async t => {
  const { ledger, path } = fixture(t);
  const budget = withChatBudget(chatModel, config, amount => ledger.reserve("client", amount));
  let calls = 0;
  const lock = new DatabaseSync(path);
  lock.exec("BEGIN IMMEDIATE");
  try {
    await assert.rejects(budget.generate(analysis, async () => { calls++; }), expectStatus(503));
  } finally { lock.close(); }
  budget.settle();
  assert.equal(calls, 0);
  assert.equal(charges(path)[0].spent, 0);
});
