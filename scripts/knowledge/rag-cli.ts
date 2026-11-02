import { loadEnvFile } from "node:process";
import { closeSync, openSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { indexKnowledge, indexStatus } from "../../src/features/philosopher-conversation/server/rag/index-store.ts";
import { ragConfig } from "../../src/features/philosopher-conversation/server/rag/config.ts";
import { createEmbedder } from "../../src/features/philosopher-conversation/server/rag/embeddings.ts";
try { loadEnvFile(".env.local"); } catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error; }
const config = ragConfig();
const path = resolve("storage/knowledge/sophia-knowledge.sqlite");
const command = process.argv[2];
if (command === "status") console.log(JSON.stringify(indexStatus(path, config), null, 2));
else if (command === "index") {
  // Local filesystem access is the administrative boundary; no HTTP endpoint exists.
  const lock = resolve("storage/knowledge/rag-index.lock");
  let fd: number | undefined;
  try {
    fd = openSync(lock, "wx");
    const started = Date.now();
    const result = await indexKnowledge(path, config, createEmbedder(config));
    console.log(JSON.stringify({ ...result, durationMs: Date.now() - started }, null, 2));
  } catch { console.error("Indexing failed. Check credentials, database and index lock. Previous completed document indexes are preserved; no private text is logged."); process.exitCode = 1; }
  finally { if (fd !== undefined) { closeSync(fd); unlinkSync(lock); } }
} else { console.error("Usage: rag-cli.ts status | index"); process.exitCode = 1; }
