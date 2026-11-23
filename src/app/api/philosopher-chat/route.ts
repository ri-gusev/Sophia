import { createChatHandler } from "@/features/philosopher-conversation/server/chat-http";
import { answerHistoricalPlato } from "@/features/philosopher-conversation/server/historical-chat";
import { ragConfig } from "@/features/philosopher-conversation/server/rag/config";
import { indexStatus, searchIndex } from "@/features/philosopher-conversation/server/rag/index-store";
import { createEmbedder } from "@/features/philosopher-conversation/server/rag/embeddings";
import { createOpenAITextGenerator } from "@/features/philosopher-conversation/server/openai-provider";
import { chatSettings, unavailable } from "@/features/philosopher-conversation/server/chat-access";
import { createChatLedger } from "@/features/philosopher-conversation/server/chat-ledger";
import { chatModel, withChatBudget } from "@/features/philosopher-conversation/server/chat-billing";
import { ChatError } from "@/features/philosopher-conversation/chat-contract";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function initialize() {
  const settings = chatSettings();
  const ledger = createChatLedger(settings.path, settings.limits, Date.now, settings.createLedger);
  return { ...settings, ...ledger };
}

let security: ReturnType<typeof initialize> | undefined;
const access = () => security ??= initialize();

export const POST = createChatHandler({
  access,
  answer: async (request, signal, client) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key?.trim()) throw unavailable();
    const config = ragConfig();
    const path = join(process.cwd(), "storage/knowledge/sophia-knowledge.sqlite");
    if (config.enabled && !indexStatus(path, config).ready) throw new ChatError(503, "Материалы для разговора требуют обновления. Попробуйте позже.");

    const model = process.env.OPENAI_MODEL?.trim() || chatModel;
    const budget = withChatBudget(model, config, amount => access().reserve(client, amount));
    let retrievalMs = 0;
    try {
      return await answerHistoricalPlato(request, {
        generate: generation => budget.generate(generation, onUsage => createOpenAITextGenerator({ apiKey: key, model, onUsage })(generation)),
        retrieve: async (query, abort) => {
          if (!config.enabled) return [];
          const started = Date.now();
          const [vector] = await budget.embed(abort, onUsage => createEmbedder(config, key, fetch, onUsage)([query], abort));
          const result = searchIndex(path, query, vector, config);
          retrievalMs = Date.now() - started;
          return result;
        },
        config,
        log: metrics => console.info(JSON.stringify({ ...metrics, retrievalMs })),
      }, signal);
    } finally {
      budget.settle();
    }
  },
});
