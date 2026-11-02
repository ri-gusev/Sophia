import { createChatHandler, createRequestGate } from "@/features/philosopher-conversation/server/chat-http";
import { answerHistoricalPlato } from "@/features/philosopher-conversation/server/historical-chat";
import { ragConfig } from "@/features/philosopher-conversation/server/rag/config";
import { indexStatus, searchIndex } from "@/features/philosopher-conversation/server/rag/index-store";
import { createEmbedder } from "@/features/philosopher-conversation/server/rag/embeddings";
import { createOpenAITextGenerator } from "@/features/philosopher-conversation/server/openai-provider";
import { ChatError } from "@/features/philosopher-conversation/chat-contract";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createChatHandler({
  gate: createRequestGate(),
  answer: async (request, signal) => {
    const config = ragConfig();
    const path = join(process.cwd(), "storage/knowledge/sophia-knowledge.sqlite");
    // Fail before paid analysis/compaction when a required index is absent or stale.
    if (config.enabled && !indexStatus(path, config).ready) throw new ChatError(503, "Материалы для разговора требуют обновления. Попробуйте позже.");
    let inputTokens = 0, outputTokens = 0, retrievalMs = 0;
    const embed = createEmbedder(config);
    return answerHistoricalPlato(request, {
      generate: createOpenAITextGenerator({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini", onUsage: usage => { inputTokens += usage.input; outputTokens += usage.output; } }),
      retrieve: async (query, abort) => {
        if (!config.enabled) return [];
        const started = Date.now();
        const [vector] = await embed([query], abort);
        const result = searchIndex(path, query, vector, config);
        retrievalMs = Date.now() - started;
        return result;
      }, config,
      log: metrics => console.info(JSON.stringify({ ...metrics, retrievalMs, inputTokens, outputTokens })),
    }, signal);
  },
});
