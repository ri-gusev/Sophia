import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { KnowledgeStore } from "../knowledge/knowledge-store.ts";
import { chunkMarkdown } from "../../src/features/philosopher-conversation/server/rag/chunking.ts";
import { indexKnowledge, indexStatus, searchIndex } from "../../src/features/philosopher-conversation/server/rag/index-store.ts";
import { ragConfig } from "../../src/features/philosopher-conversation/server/rag/config.ts";

const config = { ...ragConfig({}), dimensions: 3, chunkTokens: 80, overlapTokens: 15, threshold: 0.25 };
const embed = async (texts: string[]) => texts.map(text => /справедлив|равенств/iu.test(text) ? [1, 0, 0] : [0, 1, 0]);

test("structure-aware chunks preserve metadata, provenance and arguments without claiming verification", () => {
  const chunks = chunkMarkdown("# Учение\n\nsource_id: synthetic-1\nwork: Государство\nstephanus: 433a\nclaim_type: philosophical_position\nverification_status: verified\nrights: synthetic\n\nСправедливость означает выполнять своё дело.\n\n## Редактор\n\nclaim_type: editorial\n\nЗаметка редактора.", config);
  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0].metadata.source_id, "synthetic-1");
  assert.equal(chunks[0].metadata.work, "Государство");
  assert.equal(chunks[0].metadata.stephanus, "433a");
  assert.equal(chunks[0].metadata.verification_status, "verified");
  assert.equal(chunks.at(-1)?.metadata.claim_type, "editorial");
  assert.equal(chunkMarkdown("# Не проверено\n\nОбычный абзац.", config)[0].metadata.verification_status, "unknown");
  assert.ok(chunks.every(chunk => chunk.hash.length === 64));
});

test("JSON records and markdown metadata keep complete records distinct from editorial notes", () => {
  const records = { records: [
    { source_id: "json-source", work: "Менон", stephanus: "70a", claim_type: "position", verification_status: "verified", related_ids: ["second"], translation: "synthetic", rights: "test", content: "О добродетели." },
    { source_id: "note", claim_type: "editorial", content: "Редакторское примечание." },
  ] };
  const chunks = chunkMarkdown("```json\n" + JSON.stringify(records, null, 2) + "\n```", config);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].metadata.stephanus, "70a");
  assert.equal(chunks[0].metadata.related_ids, '["second"]');
  assert.equal(chunks[1].metadata.verification_status, "unknown");
  assert.ok(!chunks[1].content.includes("О добродетели"));
});

test("bold metadata formats normalize identically and over-budget arguments fail before indexing", () => {
  for (const form of ["**source_id:** q1\n**verification_status:** verified", "**source_id**: q1\n**verification_status**: verified"]) {
    const [chunk] = chunkMarkdown(`# Источник\n${form}\n\nФилософское утверждение.`, config);
    assert.equal(chunk.metadata.source_id, "q1");
    assert.equal(chunk.metadata.verification_status, "verified");
  }
  assert.throws(() => chunkMarkdown("# Слишком длинный аргумент\n\n" + "а".repeat(19000), config), /argument/i);
});

test("index is atomic, idempotent, model-versioned and retrieves semantic matches without keywords", async t => {
  const root = mkdtempSync(join(tmpdir(), "sophia-rag-"));
  const store = new KnowledgeStore(join(root, "data"));
  t.after(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
  const filePath = join(root, "synthetic.md");
  writeFileSync(filePath, "# Этика\n\nsource_id: test\nwork: Государство\nverification_status: verified\n\nСправедливость и устройство души.");
  store.importFile({ filePath, documentId: "ethics", title: "Synthetic", philosophers: [{ id: "plato", name: "Платон" }] });
  let calls = 0;
  const embedding = async (texts: string[]) => { calls++; return embed(texts); };
  await indexKnowledge(store.databasePath, config, embedding);
  const after = calls;
  await indexKnowledge(store.databasePath, config, embedding);
  assert.equal(calls, after);
  assert.equal(indexStatus(store.databasePath, config).ready, true);
  const results = searchIndex(store.databasePath, "гармония", [1, 0, 0], config);
  assert.equal(results.length, 1);
  assert.equal(results[0].work, "Государство");
  assert.equal(searchIndex(store.databasePath, "гармония", [0, 0, 1], config).length, 0);
  assert.equal(searchIndex(store.databasePath, "Справедливость", [0, 0, 1], config).length, 0, "keyword hit must not bypass semantic relevance floor");
  assert.throws(() => searchIndex(store.databasePath, "гармония", [1, 0, 0], config, "aristotle"));
  writeFileSync(filePath, "# Этика\n\nНовая справедливость.");
  store.importFile({ filePath, documentId: "ethics", title: "Synthetic", philosophers: [{ id: "plato", name: "Платон" }] });
  assert.equal(indexStatus(store.databasePath, config).ready, false);
  await assert.rejects(indexKnowledge(store.databasePath, config, async () => { throw new Error("synthetic embedding failure"); }));
  assert.equal(indexStatus(store.databasePath, config).chunks, 1);
  assert.throws(() => searchIndex(store.databasePath, "справедливость", [1, 0, 0], config));
  await indexKnowledge(store.databasePath, config, embedding);
  assert.equal(indexStatus(store.databasePath, config).ready, true);
  assert.equal(indexStatus(store.databasePath, { ...config, embeddingModel: "other" }).ready, false);
  const db = new DatabaseSync(store.databasePath);
  db.exec("DELETE FROM rag_chunks");
  db.close();
  assert.equal(indexStatus(store.databasePath, config).ready, false);
  await indexKnowledge(store.databasePath, config, embedding);
  assert.equal(indexStatus(store.databasePath, config).ready, true);
});
