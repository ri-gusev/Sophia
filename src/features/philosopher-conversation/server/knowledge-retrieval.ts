import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { ChatError } from "../chat-contract.ts";
import type { ChatSource } from "../chat-contract.ts";

export type KnowledgeExcerpt = ChatSource & { text: string };
type SourceDocument = { documentId: string; title: string; revision: number; text: string };
const STOP_WORDS = new Set(["что", "это", "как", "для", "или", "такое", "такой", "платон", "платона", "можно", "почему", "какой", "меня", "мне", "про", "чем", "чего", "есть", "быть", "если", "тогда", "когда"]);

function words(text: string): string[] {
  return (text.toLowerCase().replaceAll("ё", "е").match(/[\p{L}\p{N}]{3,}/gu) ?? [])
    .filter(word => !STOP_WORDS.has(word)).map(word => word.length > 6 ? word.slice(0, -2) : word);
}

/** Local lexical retrieval; no embedding requests or external file uploads. */
export function rankExcerpts(documents: SourceDocument[], query: string): KnowledgeExcerpt[] {
  const terms = [...new Set(words(query))].slice(0, 24);
  if (!terms.length) return [];
  const candidates: (KnowledgeExcerpt & { score: number })[] = [];
  for (const document of documents) {
    // Overlapping character windows work without assuming an editorial schema.
    for (let start = 0, part = 1; start < document.text.length; start += 1000, part++) {
      const text = document.text.slice(start, start + 1200);
      const tokens = words(text);
      const score = terms.reduce((sum, term) => sum + Math.min(3, tokens.filter(token => token === term || token.startsWith(term) || term.startsWith(token)).length), 0);
      if (score > 0) candidates.push({ id: `${document.documentId}@${document.revision}:${part}`, documentId: document.documentId, title: document.title, revision: document.revision, text, score });
    }
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, 4).map(({ score: _score, ...excerpt }) => {
    void _score;
    return excerpt;
  });
}

export function retrievePlatoExcerpts(query: string, path = join(process.cwd(), "storage/knowledge/sophia-knowledge.sqlite")): KnowledgeExcerpt[] {
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(path, { readOnly: true });
    const rows = db.prepare(`SELECT d.id, d.title, r.revision, r.content, r.sha256 FROM documents d
      JOIN document_philosophers p ON p.document_id = d.id
      JOIN document_revisions r ON r.document_id = d.id
      WHERE p.philosopher_id = ? AND r.revision = (SELECT MAX(v.revision) FROM document_revisions v WHERE v.document_id = d.id)
      AND r.byte_length <= 2097152 ORDER BY d.id LIMIT 33`).all("plato");
    if (!rows.length || rows.length > 32) throw new Error("Knowledge unavailable");
    let bytes = 0;
    const documents = rows.map(row => {
      if (!(row.content instanceof Uint8Array)) throw new Error("Invalid corpus");
      bytes += row.content.byteLength;
      if (bytes > 4 * 1024 * 1024 || createHash("sha256").update(row.content).digest("hex") !== row.sha256) throw new Error("Invalid corpus");
      return { documentId: String(row.id), title: String(row.title), revision: Number(row.revision), text: new TextDecoder("utf-8", { fatal: true }).decode(row.content) };
    });
    return rankExcerpts(documents, query);
  } catch {
    throw new ChatError(503, "Материалы для разговора временно недоступны.");
  } finally { db?.close(); }
}
