import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { ChatError } from "../../chat-contract.ts";
import type { KnowledgeExcerpt } from "../knowledge-retrieval.ts";
import { chunkMarkdown, hash } from "./chunking.ts";
import type { RagConfig } from "./config.ts";
import { validVector, type Embedder } from "./embeddings.ts";

const signature = (config: RagConfig) => hash(JSON.stringify({ version: 2, tokens: config.chunkTokens, overlap: config.overlapTokens, contextChars: config.contextChars, model: config.embeddingModel, dimensions: config.dimensions }));
const modelVersion = (config: RagConfig) => `${config.embeddingModel}:${config.dimensions}`;
function open(path: string, readOnly: boolean) {
  const db = new DatabaseSync(path, { readOnly });
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  return db;
}
function latest(db: DatabaseSync, philosopherId: string) {
  return db.prepare(`SELECT d.id, d.title, r.revision, r.sha256, r.byte_length FROM documents d
    JOIN document_philosophers p ON p.document_id=d.id JOIN document_revisions r ON r.document_id=d.id
    WHERE p.philosopher_id=? AND r.revision=(SELECT MAX(v.revision) FROM document_revisions v WHERE v.document_id=d.id) ORDER BY d.id`).all(philosopherId);
}
function status(db: DatabaseSync, config: RagConfig, philosopherId: string) {
  const docs = latest(db, philosopherId);
  const chunks = Number(db.prepare("SELECT count(*) AS n FROM rag_chunks WHERE philosopher_id=?").get(philosopherId)?.n ?? 0);
  const ready = docs.length > 0 && docs.length <= 32 && docs.every(doc => {
    const indexed = db.prepare("SELECT source_hash,config_hash,revision,chunk_count FROM rag_documents WHERE document_id=? AND philosopher_id=?").get(doc.id, philosopherId);
    const count = Number(db.prepare("SELECT count(*) AS n FROM rag_chunks WHERE document_id=? AND philosopher_id=? AND revision=? AND embedding_model_version=?").get(doc.id, philosopherId, doc.revision, modelVersion(config))?.n ?? 0);
    return indexed?.source_hash === doc.sha256 && indexed?.config_hash === signature(config) && indexed?.revision === doc.revision && indexed?.chunk_count === count && count > 0;
  });
  return { ready, documents: docs.length, chunks, embeddingModel: config.embeddingModel, dimensions: config.dimensions };
}
export function indexStatus(path: string, config: RagConfig, philosopherId = "plato") {
  let db: DatabaseSync | undefined;
  try { db = open(path, true); return status(db, config, philosopherId); }
  catch { return { ready: false, documents: 0, chunks: 0, embeddingModel: config.embeddingModel, dimensions: config.dimensions }; }
  finally { db?.close(); }
}

/** Offline only. Network calls precede the atomic commit; failure leaves the prior index intact. */
export async function indexKnowledge(path: string, config: RagConfig, embed: Embedder, philosopherId = "plato") {
  const db = open(path, false);
  try {
    const version = Number(db.prepare("PRAGMA user_version").get()?.user_version);
    if (version !== 1 && version !== 2) throw new Error("Unsupported knowledge schema");
    db.exec(readFileSync(new URL("../../../../../database/knowledge/002-rag-index.sql", import.meta.url), "utf8"));
    const docs = latest(db, philosopherId);
    if (!docs.length || docs.length > 32 || docs.reduce((n, doc) => n + Number(doc.byte_length), 0) > 4 * 1024 * 1024) throw new Error("Corpus limits exceeded");
    let changed = 0, embedded = 0;
    for (const doc of docs) {
      const existing = db.prepare("SELECT source_hash,config_hash,chunk_count FROM rag_documents WHERE document_id=? AND philosopher_id=?").get(doc.id, philosopherId);
      const count = Number(db.prepare("SELECT count(*) AS n FROM rag_chunks WHERE document_id=? AND philosopher_id=?").get(doc.id, philosopherId)?.n ?? 0);
      if (existing?.source_hash === doc.sha256 && existing?.config_hash === signature(config) && existing?.chunk_count === count && count > 0) continue;
      const bytes = db.prepare("SELECT content FROM document_revisions WHERE document_id=? AND revision=?").get(doc.id, doc.revision)?.content;
      if (!(bytes instanceof Uint8Array) || bytes.length > 2097152 || hash(bytes) !== doc.sha256) throw new Error("Invalid corpus checksum");
      const parts = chunkMarkdown(new TextDecoder("utf8", { fatal: true }).decode(bytes), config);
      if (!parts.length || parts.length > 10000) throw new Error("Invalid chunk count");
      const cached = new Map(db.prepare("SELECT content_hash, embedding FROM rag_chunks WHERE document_id=? AND philosopher_id=? AND embedding_model_version=?").all(doc.id, philosopherId, modelVersion(config))
        .map(row => [String(row.content_hash), JSON.parse(String(row.embedding)) as unknown]));
      const vectors: number[][] = [];
      const missing: number[] = [];
      for (let i = 0; i < parts.length; i++) { const vector = cached.get(parts[i].hash); if (validVector(vector, config.dimensions)) vectors[i] = vector; else missing.push(i); }
      for (let i = 0; i < missing.length; i += 16) {
        const batch = missing.slice(i, i + 16);
        const result = await embed(batch.map(index => parts[index].content));
        if (result.length !== batch.length || result.some(v => !validVector(v, config.dimensions))) throw new Error("Invalid embedding response");
        batch.forEach((index, j) => { vectors[index] = result[j]; }); embedded += batch.length;
      }
      db.exec("BEGIN IMMEDIATE");
      try {
        const current = latest(db, philosopherId).find(item => item.id === doc.id);
        if (current?.sha256 !== doc.sha256) throw new Error("Corpus changed during indexing; retry");
        db.prepare("DELETE FROM rag_fts WHERE chunk_id IN (SELECT chunk_id FROM rag_chunks WHERE document_id=? AND philosopher_id=?)").run(doc.id, philosopherId);
        db.prepare("DELETE FROM rag_chunks WHERE document_id=? AND philosopher_id=?").run(doc.id, philosopherId);
        const now = new Date().toISOString();
        const insert = db.prepare(`INSERT INTO rag_chunks VALUES (${Array.from({ length: 20 }, () => "?").join(",")})`);
        parts.forEach((part, i) => {
          const id = `${philosopherId}:${doc.id}@${doc.revision}:${i}:${part.hash.slice(0, 12)}`;
          const m = part.metadata;
          insert.run(id, doc.id, philosopherId, doc.revision, i, m.source_id, m.work, m.stephanus, m.claim_type, m.verification_status,
            part.content, part.heading, JSON.stringify(vectors[i]), m.related_ids, m.translation, m.rights, part.hash, modelVersion(config), now, now);
          db.prepare("INSERT INTO rag_fts(chunk_id,philosopher_id,content) VALUES (?,?,?)").run(id, philosopherId, `${part.heading}\n${m.work}\n${part.content}`);
        });
        db.prepare("INSERT OR REPLACE INTO rag_documents VALUES (?,?,?,?,?,?,?)").run(doc.id, philosopherId, doc.revision, doc.sha256, signature(config), parts.length, now);
        db.exec("COMMIT"); changed++;
      } catch (error) { if (db.isTransaction) db.exec("ROLLBACK"); throw error; }
    }
    return { ...status(db, config, philosopherId), changed, embedded };
  } finally { db.close(); }
}

export function cosine(a: number[], b: number[]) {
  let dot = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; x += a[i] ** 2; y += b[i] ** 2; }
  return dot / Math.sqrt(x * y);
}
export function searchIndex(path: string, query: string, vector: number[], config: RagConfig, philosopherId = "plato"): KnowledgeExcerpt[] {
  let db: DatabaseSync | undefined;
  try {
    db = open(path, true);
    // Readiness, vectors and FTS must refer to the same index/revision snapshot.
    db.exec("BEGIN");
    if (!status(db, config, philosopherId).ready || !validVector(vector, config.dimensions)) throw new Error("Index missing, stale or incompatible");
    const rows = db.prepare(`SELECT c.*, d.title FROM rag_chunks c JOIN documents d ON d.id=c.document_id
      JOIN rag_documents i ON i.document_id=c.document_id AND i.philosopher_id=c.philosopher_id
      WHERE c.philosopher_id=? AND c.revision=i.revision LIMIT 10001`).all(philosopherId);
    if (rows.length > 10000) throw new Error("Index too large");
    const ranked = rows.map(row => {
      const embedding: unknown = JSON.parse(String(row.embedding));
      if (!validVector(embedding, config.dimensions) || hash(JSON.stringify({ content: String(row.content), metadata: {
        source_id: String(row.source_id), work: String(row.work), stephanus: String(row.stephanus), claim_type: String(row.claim_type), verification_status: String(row.verification_status), related_ids: String(row.related_ids), translation: String(row.translation), rights: String(row.rights),
      }, heading: String(row.heading) })) !== row.content_hash) throw new Error("Index corrupted");
      return { row, similarity: cosine(vector, embedding), score: 0 };
    }).filter(item => !/^(rejected|disputed|invalid|отклонено)$/i.test(String(item.row.verification_status)));
    const vectorRank = ranked.filter(item => item.similarity >= config.threshold).sort((a, b) => b.similarity - a.similarity).slice(0, config.vectorK);
    vectorRank.forEach((item, i) => { item.score += 1 / (60 + i + 1); });
    const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].slice(0, 24);
    if (terms.length) {
      const matches = db.prepare("SELECT chunk_id FROM rag_fts WHERE rag_fts MATCH ? AND philosopher_id=? ORDER BY rank LIMIT ?")
        .all(terms.map(term => `"${term}"*`).join(" OR "), philosopherId, config.keywordK);
      matches.forEach((match, i) => { const item = ranked.find(candidate => candidate.row.chunk_id === match.chunk_id); if (item && item.similarity >= config.threshold) item.score += 1 / (60 + i + 1); });
    }
    // Work/heading matches and verified metadata boost ranking; unknown material stays explicitly unknown.
    for (const item of ranked) if (item.score) {
      if (String(item.row.work) && query.toLowerCase().includes(String(item.row.work).toLowerCase())) item.score *= 1.2;
      if (/^(verified|confirmed|проверено)$/i.test(String(item.row.verification_status))) item.score *= 1.05;
    }
    const selected = ranked.filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    const result: KnowledgeExcerpt[] = [], seen = new Set<string>(); let chars = 0;
    const add = (item: (typeof ranked)[number]) => {
      const r = item.row, content = String(r.content);
      if (seen.has(String(r.content_hash)) || result.length >= config.finalK || chars + content.length > config.contextChars) return;
      seen.add(String(r.content_hash)); chars += content.length;
      result.push({ id: String(r.chunk_id), documentId: String(r.document_id), title: String(r.title), revision: Number(r.revision), text: content,
        sourceId: String(r.source_id), work: String(r.work), stephanus: String(r.stephanus), claimType: String(r.claim_type), verificationStatus: String(r.verification_status) });
    };
    for (const item of selected) {
      add(item);
      // Extend only a continued argument with the same source/type; never editorial neighbours.
      const next = ranked.find(candidate => candidate.row.document_id === item.row.document_id && Number(candidate.row.ordinal) === Number(item.row.ordinal) + 1
        && candidate.row.source_id === item.row.source_id && candidate.row.claim_type === item.row.claim_type && candidate.row.heading === item.row.heading);
      if (next && item.row.source_id && String(item.row.claim_type) !== "editorial") add(next);
    }
    return result;
  } catch { throw new ChatError(503, "Индекс материалов недоступен или требует обновления."); }
  finally { if (db?.isTransaction) db.exec("ROLLBACK"); db?.close(); }
}
