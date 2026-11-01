import { createChatHandler, createRequestGate } from "@/features/philosopher-conversation/server/chat-http";
import { answerPlato } from "@/features/philosopher-conversation/server/chat-service";
import { retrievePlatoExcerpts } from "@/features/philosopher-conversation/server/knowledge-retrieval";
import { createOpenAITextGenerator } from "@/features/philosopher-conversation/server/openai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createChatHandler({
  gate: createRequestGate(),
  answer: (request, signal) => answerPlato(request, {
    generate: createOpenAITextGenerator({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini" }),
    retrieve: retrievePlatoExcerpts,
  }, signal),
});
