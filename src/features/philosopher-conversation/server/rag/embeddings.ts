import { ChatError } from "../../chat-contract.ts";
import type { RagConfig } from "./config.ts";

export type Embedder = (texts: string[], signal?: AbortSignal) => Promise<number[][]>;
export function validVector(value: unknown, dimensions: number): value is number[] {
  return Array.isArray(value) && value.length === dimensions && value.every(v => typeof v === "number" && Number.isFinite(v)) && value.some(v => v !== 0);
}
export function createEmbedder(config: Pick<RagConfig, "dimensions" | "embeddingModel">, key = process.env.OPENAI_API_KEY, fetcher: typeof fetch = fetch): Embedder {
  return async (texts, signal) => {
    if (!key?.trim()) throw new ChatError(503, "Семантический поиск пока недоступен.");
    try {
      const response = await fetcher("https://api.openai.com/v1/embeddings", { method: "POST", cache: "no-store",
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000),
        headers: { Authorization: `Bearer ${key.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.embeddingModel, dimensions: config.dimensions, input: texts, encoding_format: "float" }) });
      if (!response.ok) { await response.body?.cancel(); throw new Error("Embedding provider unavailable"); }
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("data" in body) || !Array.isArray(body.data) || body.data.length !== texts.length) throw new Error("Invalid embeddings");
      const vectors: number[][] = [];
      for (const item of body.data) {
        if (!item || typeof item !== "object" || !Number.isInteger(item.index) || item.index < 0 || item.index >= texts.length || vectors[item.index] || !validVector(item.embedding, config.dimensions)) throw new Error("Invalid embedding vector");
        vectors[item.index] = item.embedding;
      }
      return vectors;
    } catch { throw new ChatError(signal?.aborted ? 499 : 503, signal?.aborted ? "Отправка остановлена." : "Семантический поиск временно недоступен."); }
  };
}
