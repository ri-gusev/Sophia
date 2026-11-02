import { createHash } from "node:crypto";
import type { RagConfig } from "./config.ts";

export const metadataKeys = ["source_id", "work", "stephanus", "claim_type", "verification_status", "related_ids", "translation", "rights"] as const;
export type ChunkMetadata = Record<(typeof metadataKeys)[number], string>;
export type TextChunk = { content: string; metadata: ChunkMetadata; hash: string; ordinal: number; heading: string };
export const hash = (text: string | Uint8Array) => createHash("sha256").update(text).digest("hex");
// Conservative character estimate, not an exact model tokenizer. Paragraphs/arguments are atomic.
export const approximateTokens = (text: string) => Math.ceil(text.length / 3);

export function chunkMarkdown(markdown: string, config: Pick<RagConfig, "chunkTokens" | "overlapTokens"> & { contextChars?: number }): TextChunk[] {
  const empty = (): ChunkMetadata => ({ source_id: "", work: "", stephanus: "", claim_type: "unknown", verification_status: "unknown", related_ids: "", translation: "", rights: "" });
  let metadata = empty(), heading = "", blocks: string[] = [], size = 0;
  const chunks: TextChunk[] = [];
  function flush(overlap = false) {
    if (!blocks.length) return;
    const content = blocks.join("\n\n").trim();
    const meta = { ...metadata };
    chunks.push({ content, metadata: meta, hash: hash(JSON.stringify({ content, metadata: meta, heading })), ordinal: chunks.length, heading });
    const tail: string[] = [];
    let tailSize = 0;
    if (overlap) for (let i = blocks.length - 1; i >= 0; i--) {
      const tokens = approximateTokens(blocks[i]);
      if (tailSize + tokens > config.overlapTokens) break;
      tail.unshift(blocks[i]); tailSize += tokens;
    }
    blocks = tail; size = tailSize;
  }
  // Headings and metadata changes are hard boundaries: editorial notes never inherit a claim type.
  function jsonRecords(raw: string): string | undefined {
    let value: unknown;
    try { value = JSON.parse(raw); } catch { return; }
    const root = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
    const records = Array.isArray(value) ? value : root && (Array.isArray(root.records) ? root.records : Array.isArray(root.chunks) ? root.chunks : [root]);
    if (!records?.length || records.some(record => !record || typeof record !== "object" || !(typeof record.content === "string" || typeof record.text === "string"))) return;
    return records.map(record => `# Record\n\n${metadataKeys.filter(key => record[key] !== undefined).map(key => `${key}: ${typeof record[key] === "string" ? record[key] : JSON.stringify(record[key])}`).join("\n")}\n\n${record.content ?? record.text}`).join("\n\n");
  }
  const withRecords = markdown.replace(/```json\s*\n([\s\S]*?)\n```/g, (whole: string, raw: string) => jsonRecords(raw) ?? whole);
  const normalized = (jsonRecords(withRecords) ?? withRecords).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/^```(?:json|yaml|yml|markdown|md)?\s*$/gm, "");
  for (const section of normalized.split(/(?=^#{1,6}\s)/m)) {
    flush(); blocks = []; size = 0; metadata = empty();
    const lines: string[] = [];
    for (const line of section.split("\n")) {
      const title = line.match(/^#{1,6}\s+(.+)/);
      if (title) { heading = title[1].trim(); continue; }
      const field = line.replace(/\*\*|`/g, "").match(/^\s*(?:[-*]\s*)?["']?(source_id|work|stephanus|claim_type|verification_status|related_ids|translation|rights)["']?\s*:\s*(.*)$/i);
      if (field) {
        // Flush prior arguments before a record's metadata changes.
        if (lines.some(item => item.trim())) { append(lines.splice(0).join("\n")); flush(); blocks = []; size = 0; metadata = empty(); }
        metadata[field[1].toLowerCase() as keyof ChunkMetadata] = field[2].trim().replace(/^['"]|['"],?$/g, "");
      } else lines.push(line);
    }
    append(lines.join("\n"));
  }
  flush();
  return chunks;

  function append(text: string) {
    for (const paragraph of text.split(/\n\s*\n/)) {
      const clean = paragraph.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim();
      if (!clean || clean === "---") continue;
      const tokens = approximateTokens(clean);
      const budget = Math.min(config.contextChars ?? 18000, 20000);
      if ((size + tokens > config.chunkTokens || blocks.join("\n\n").length + clean.length + 2 > budget) && blocks.length) flush(true);
      if (blocks.join("\n\n").length + clean.length + 2 > budget) { blocks = []; size = 0; }
      if (clean.length > budget) throw new Error("An argument exceeds the context budget; split it editorially before indexing");
      blocks.push(clean); size += tokens;
    }
  }
}
