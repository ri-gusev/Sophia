export type RagConfig = ReturnType<typeof ragConfig>;
export function ragConfig(env: Record<string, string | undefined> = process.env) {
  function integer(key: string, fallback: number, min: number, max: number) {
    const value = env[key] === undefined ? fallback : Number(env[key]);
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${key}`);
    return value;
  }
  const chunkTokens = integer("PLATO_CHUNK_SIZE", 800, 80, 1800);
  const overlapTokens = integer("PLATO_CHUNK_OVERLAP", 200, 0, 600);
  if (overlapTokens >= chunkTokens) throw new Error("Chunk overlap must be smaller than target");
  const threshold = Number(env.PLATO_RETRIEVAL_THRESHOLD ?? "0.25");
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error("Invalid retrieval threshold");
  const embeddingModel = env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
  if (!/^text-embedding-3-(small|large)$/.test(embeddingModel)) throw new Error("Unsupported embedding model");
  if (env.PLATO_HISTORICAL_MODE === "false") throw new Error("Historical mode is required for the Plato character");
  return { enabled: env.PLATO_RAG_ENABLED !== "false", validation: env.PLATO_VALIDATION_ENABLED !== "false", historical: env.PLATO_HISTORICAL_MODE !== "false",
    chunkTokens, overlapTokens, embeddingModel, dimensions: integer("PLATO_EMBEDDING_DIMENSIONS", 1536, 256, embeddingModel.endsWith("small") ? 1536 : 3072),
    vectorK: integer("PLATO_VECTOR_TOP_K", 12, 1, 30), keywordK: integer("PLATO_KEYWORD_TOP_K", 12, 1, 30), finalK: integer("PLATO_FINAL_CONTEXT_K", 6, 1, 8),
    contextChars: integer("PLATO_CONTEXT_CHARS", 18000, 2000, 32000), threshold };
}
