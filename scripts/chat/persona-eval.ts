/** Explicit real-API evaluation requested by the owner. Only the ten synthetic prompts are recorded. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseChatReply, EMPTY_CHAT_MEMORY, type ChatReply } from "../../src/features/philosopher-conversation/chat-contract.ts";
const origin = process.env.SOPHIA_CHECK_ORIGIN || "http://127.0.0.1:3102";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Use a loopback evaluation server");
const prompts = ["Привет", "Я подставил друга, но помог другому человеку", "Что такое знание?", "Ты знаком с Алкивиадом?", "Что ты думаешь об искусственном интеллекте?", "Я считаю, что справедливость — это сила", "Я не согласен с тобой", "Объясни теорию идей", "Почему Сократа казнили?", "Ты читал Канта?"];
type Result = { number: number; prompt: string; status: number; durationMs: number; outcome?: ChatReply["outcome"]; message?: string; error?: string; context: "fresh" | "after-6" };
const results: Result[] = [];
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const directory = resolve("artifacts/plato-persona-eval"); mkdirSync(directory, { recursive: true });
let sixth: ChatReply | undefined;
for (const [index, prompt] of prompts.entries()) {
  const start = Date.now();
  const context = index === 6 ? "after-6" : "fresh";
  const dependencyFailed = index === 6 && (!sixth || sixth.outcome === "abstained");
  try {
    if (dependencyFailed) throw new Error("Scenario 6 did not establish a valid dialogue context");
    const response = await fetch(`${origin}/api/philosopher-chat`, { method: "POST", signal: AbortSignal.timeout(120000), headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ philosopherId: "plato", message: prompt, memory: index === 6 && sixth ? sixth.memory : EMPTY_CHAT_MEMORY }) });
    if (!response.ok) { await response.body?.cancel(); results.push({ number: index + 1, prompt, status: response.status, durationMs: Date.now() - start, error: "API request failed", context }); process.exitCode = 1; }
    else {
      const reply = parseChatReply(await response.json());
      if (index === 5) sixth = reply;
      results.push({ number: index + 1, prompt, status: response.status, durationMs: Date.now() - start, message: reply.message, outcome: reply.outcome, context });
      if (reply.outcome === "abstained") process.exitCode = 1;
    }
  } catch { results.push({ number: index + 1, prompt, status: 0, durationMs: Date.now() - start, error: dependencyFailed ? "Dependency failure: scenario 6 failed; scenario 7 skipped" : "Transport/response validation failure", context }); process.exitCode = 1; }
  writeFileSync(resolve(directory, `${runId}.json`), JSON.stringify({ runId, origin, kind: "actual API replies; no mocked answers", results }, null, 2), "utf8");
  const last = results.at(-1)!;
  console.log(JSON.stringify({ number: last.number, status: last.status, outcome: last.outcome, durationMs: last.durationMs, chars: last.message?.length ?? 0 }));
}
console.log(JSON.stringify({ artifact: `artifacts/plato-persona-eval/${runId}.json`, total: results.length, answered: results.filter(item => item.outcome === "answer" || item.outcome === "clarification").length, abstained: results.filter(item => item.outcome === "abstained").length }));
