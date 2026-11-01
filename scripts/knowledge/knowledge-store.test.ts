import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { KnowledgeStore } from "./knowledge-store.ts";

const plato = { id: "plato", name: "Платон" };
const aristotle = { id: "aristotle", name: "Аристотель" };
const topic = { id: "virtue", name: "Добродетель" };

function fixture(t: TestContext) {
  const root = mkdtempSync(join(resolve(tmpdir()), "sophia-knowledge-"));
  const store = new KnowledgeStore(join(root, "store"));
  t.after(() => {
    store.close();
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep + "sophia-knowledge-"));
    rmSync(root, { recursive: true, force: true });
  });
  return { root, store };
}

test("one database shares philosophers and topics without exposing document bytes in status", t => {
  const { root, store } = fixture(t);
  const input = join(root, "source.md");
  const bytes = Buffer.from("private-test-corpus-α\n", "utf8");
  writeFileSync(input, bytes);
  const first = store.importFile({ filePath: input, documentId: "plato-virtue", title: "Платон", philosophers: [plato], topics: [topic] });
  store.importFile({ filePath: input, documentId: "aristotle-virtue", title: "Аристотель", philosophers: [aristotle], topics: [topic] });
  store.importFile({ filePath: input, documentId: "plato-virtue", title: "Платон", philosophers: [plato, aristotle], topics: [topic] });
  const status = store.status();
  assert.deepEqual(status.counts, { philosophers: 2, topics: 1, documents: 2, revisions: 2, philosopherLinks: 3, topicLinks: 2 });
  assert.equal(JSON.stringify(status).includes("private-test-corpus"), false);
  assert.deepEqual(readFileSync(first.archivePath), bytes);
  assert.deepEqual(store.verifyDocument("plato-virtue"), { documentId: "plato-virtue", revision: 1, databaseMatches: true, archiveMatches: true });
});

test("repeat imports are idempotent and a changed file creates an immutable new revision", t => {
  const { root, store } = fixture(t);
  const input = join(root, "source.md");
  const metadata = { filePath: input, documentId: "plato-corpus", title: "Корпус", philosophers: [plato] };
  writeFileSync(input, "first synthetic revision\n");
  const first = store.importFile(metadata);
  const repeated = store.importFile(metadata);
  assert.equal(first.created, true);
  assert.equal(repeated.created, false);
  assert.equal(repeated.revision, 1);
  writeFileSync(input, "second synthetic revision\n");
  const second = store.importFile(metadata);
  assert.equal(second.revision, 2);
  assert.notEqual(first.sha256, second.sha256);
  assert.equal(readFileSync(first.archivePath, "utf8"), "first synthetic revision\n");
  assert.equal(store.status().counts.revisions, 2);
  const db = new DatabaseSync(store.databasePath, { readOnly: true });
  try {
    const row = db.prepare("SELECT content FROM document_revisions WHERE document_id = ? AND revision = 1").get("plato-corpus");
    assert.equal(Buffer.from(row!.content as Uint8Array).toString("utf8"), "first synthetic revision\n");
    assert.equal(db.prepare("PRAGMA integrity_check").get()!.integrity_check, "ok");
  } finally { db.close(); }
});

test("a damaged archive is detected and a failed import rolls back its new associations", t => {
  const { root, store } = fixture(t);
  const input = join(root, "source.md");
  writeFileSync(input, "synthetic original");
  const metadata = { filePath: input, documentId: "plato-corpus", title: "Корпус", philosophers: [plato] };
  const imported = store.importFile(metadata);
  writeFileSync(imported.archivePath, "damaged synthetic copy");
  assert.deepEqual(store.verifyDocument("plato-corpus"), { documentId: "plato-corpus", revision: 1, databaseMatches: true, archiveMatches: false });
  assert.throws(() => store.importFile({ ...metadata, philosophers: [plato, aristotle] }), /checksum mismatch/i);
  assert.equal(store.status().counts.philosophers, 1);
  assert.equal(store.status().counts.philosopherLinks, 1);
  assert.equal(readFileSync(imported.archivePath, "utf8"), "damaged synthetic copy");
});

test("invalid metadata is rejected before import and database foreign keys are enforced", t => {
  const { root, store } = fixture(t);
  const input = join(root, "source.md");
  writeFileSync(input, "synthetic only");
  assert.throws(() => store.importFile({ filePath: input, documentId: "../outside", title: "Invalid", philosophers: [plato] }), /identifier/i);
  assert.throws(() => store.importFile({ filePath: input, documentId: "valid", title: "Valid", philosophers: [] }), /philosopher/i);
  assert.equal(store.status().counts.documents, 0);
  const db = new DatabaseSync(store.databasePath);
  try {
    db.exec("PRAGMA foreign_keys = ON");
    assert.throws(() => db.prepare("INSERT INTO document_philosophers(document_id, philosopher_id) VALUES (?, ?)").run("missing", "missing"), /FOREIGN KEY/);
  } finally { db.close(); }
});
