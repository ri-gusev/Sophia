import { ChatError } from "../chat-contract.ts";
import type { ChatMessage } from "../chat-contract.ts";

export type GenerationRequest = { instructions: string; input: ChatMessage[]; maxOutputTokens: number; signal?: AbortSignal; reasoningEffort?: "none" | "low"; format?: { name: string; schema: Record<string, unknown> } };
export type TextGenerator = (request: GenerationRequest) => Promise<string>;

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function createOpenAITextGenerator(options: { apiKey: string | undefined; model: string; fetcher?: typeof fetch; onUsage?: (usage: { input: number; output: number }) => void }): TextGenerator {
  return async request => {
    if (!options.apiKey?.trim() || !/^[a-zA-Z0-9_.-]{1,100}$/.test(options.model)) throw new ChatError(503, "Разговор пока недоступен. Попробуйте позже.");
    const signal = request.signal ? AbortSignal.any([request.signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000);
    let response: Response;
    try {
      response = await (options.fetcher ?? fetch)("https://api.openai.com/v1/responses", {
        method: "POST", signal, cache: "no-store",
        headers: { Authorization: `Bearer ${options.apiKey.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options.model, instructions: request.instructions, input: request.input,
          max_output_tokens: request.maxOutputTokens, store: false,
          ...(request.format ? { text: { format: { type: "json_schema", strict: true, ...request.format } } } : {}),
          ...(/^gpt-(?:5\.[4-9]|6)/.test(options.model) ? { reasoning: { effort: request.reasoningEffort ?? "none" } } : {}),
        }),
      });
    } catch {
      if (request.signal?.aborted) throw new ChatError(499, "Отправка остановлена.");
      throw new ChatError(504, "Не удалось дождаться ответа. Попробуйте ещё раз.");
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new ChatError(response.status === 429 ? 429 : 502, response.status === 429
        ? "Сейчас слишком много запросов. Попробуйте немного позже."
        : "Не удалось получить ответ. Попробуйте позже.");
    }
    let data: Record<string, unknown> | undefined;
    try { data = object(await response.json()); } catch { throw new ChatError(502, "Не удалось прочитать ответ. Попробуйте ещё раз."); }
    if (data?.status !== "completed" || !Array.isArray(data.output)) throw new ChatError(502, "Ответ не был завершён. Попробуйте ещё раз.");
    const usage = object(data.usage);
    if (typeof usage?.input_tokens === "number" && typeof usage.output_tokens === "number") options.onUsage?.({ input: usage.input_tokens, output: usage.output_tokens });
    const parts: string[] = [];
    for (const output of data.output) {
      const item = object(output);
      if (item?.type !== "message" || !Array.isArray(item.content)) continue;
      for (const content of item.content) {
        const part = object(content);
        if (part?.type === "output_text" && typeof part.text === "string") parts.push(part.text);
        else if (part?.type === "refusal" && typeof part.refusal === "string") parts.push(part.refusal);
      }
    }
    const result = parts.join("\n").trim();
    if (!result) throw new ChatError(502, "Ответ оказался пустым. Попробуйте ещё раз.");
    return result;
  };
}
