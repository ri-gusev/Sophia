import { ChatError } from "../chat-contract.ts";
import { unavailable } from "./chat-access.ts";
import type { createChatLedger } from "./chat-ledger.ts";
import type { GenerationRequest } from "./openai-provider.ts";

type Usage = { input: number; output: number; cached?: number };
type Stage = "turn_analysis" | "compaction" | "plato_draft" | "grounding_validation" | "embedding";
type Rate = { input: number; output: number; cached: number };
type Operation = { count: number; input: number; output: number; rate: Rate };
type Reservation = ReturnType<ReturnType<typeof createChatLedger>["reserve"]>;

export const chatModel = "gpt-5.4-mini-2026-03-17";
// Integer nano-USD per token at Standard rates.
const textRate = { input: 750, output: 4500, cached: 75 };

function operations(model: string, config: { enabled: boolean; validation: boolean; embeddingModel: string }): Record<Stage, Operation> {
  if (![chatModel, "gpt-5.4-mini"].includes(model)) throw unavailable();
  const embeddingRate = { input: config.embeddingModel === "text-embedding-3-small" ? 20 : 130, output: 0, cached: 0 };
  if (config.enabled && !["text-embedding-3-small", "text-embedding-3-large"].includes(config.embeddingModel)) throw unavailable();
  const text = (count: number, output: number) => ({ count, input: 400_000, output, rate: textRate });
  return {
    turn_analysis: text(1, 2000), compaction: text(1, 450), plato_draft: text(2, 1800),
    grounding_validation: text(config.validation ? 2 : 0, 2400),
    embedding: { count: config.enabled ? 1 : 0, input: 8192, output: 0, rate: embeddingRate },
  };
}

function maximum(operation: Operation) {
  return operation.input * operation.rate.input + operation.output * operation.rate.output;
}

function price(usage: Usage, rate: Rate) {
  const cached = usage.cached ?? 0;
  if (![usage.input, usage.output, cached].every(n => Number.isSafeInteger(n) && n >= 0) || usage.input === 0 || cached > usage.input) return;
  const amount = (usage.input - cached) * rate.input + cached * rate.cached + usage.output * rate.output;
  return Number.isSafeInteger(amount) ? amount : undefined;
}

export function withChatBudget(model: string, config: Parameters<typeof operations>[1], reserve: (amount: number) => Reservation) {
  const plan = operations(model, config);
  const amount = Object.values(plan).reduce((sum, operation) => sum + operation.count * maximum(operation), 0);
  const reservation = reserve(amount);
  let spent = 0;
  let estimatedOperations = 0;
  let uncertain = false;
  let running = false;
  let overage = false;

  async function run<T>(stage: Stage, output: number, signal: AbortSignal | undefined, invoke: (report: (usage: Usage) => void) => Promise<T>): Promise<T> {
    if (signal?.aborted) throw new ChatError(499, "Отправка остановлена.");
    const operation = plan[stage];
    if (running || overage || !operation?.count || output !== operation.output) throw unavailable();
    reservation.startOperation();
    operation.count--;
    running = true;
    let actual: number | undefined;
    const ceiling = maximum(operation);
    try {
      return await invoke(usage => { actual = price(usage, operation.rate); });
    } catch (error) {
      uncertain ||= actual === undefined;
      throw error;
    } finally {
      if (actual === undefined) estimatedOperations++;
      spent += actual ?? ceiling;
      if (actual !== undefined && actual > ceiling) {
        overage = true;
        console.warn(JSON.stringify({ event: "plato_cost_envelope_exceeded", ceilingNanoUsd: ceiling, actualNanoUsd: actual }));
      }
      running = false;
    }
  }

  return {
    generate: <T>(request: GenerationRequest, invoke: (report: (usage: Usage) => void) => Promise<T>) =>
      run((request.format?.name ?? "compaction") as Stage, request.maxOutputTokens, request.signal, invoke),
    embed: <T>(signal: AbortSignal | undefined, invoke: (report: (usage: Usage) => void) => Promise<T>) => run("embedding", 0, signal, invoke),
    settle() {
      if (running) throw unavailable();
      reservation.settle(spent, uncertain);
      console.info(JSON.stringify({ event: "plato_cost", reservedNanoUsd: amount, spentNanoUsd: spent, estimatedOperations, uncertain }));
    },
  };
}
