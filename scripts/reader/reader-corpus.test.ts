import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { ReaderParagraph, ReaderWork } from "../../src/features/reader/reader-types.ts";

const corpus = new URL("../../src/features/reader/corpus/", import.meta.url);
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, corpus), "utf8"));

test("reader corpus has consistent character counts, stable IDs and exact citation targets", () => {
  const catalog = read<ReaderWork[]>("catalog.json");
  const paragraphIds = new Set<string>();
  const workIds = new Set<string>();
  for (const work of catalog) {
    assert.ok(!workIds.has(work.id));
    workIds.add(work.id);
    assert.ok(work.sourceUrl && work.translator && work.edition && work.rightsStatus && work.rightsJustification);
    const sectionIds = new Set<string>();
    const anchors = Object.create(null) as Record<string, string>;
    for (const section of work.sections) {
      assert.ok(!sectionIds.has(section.id));
      sectionIds.add(section.id);
      const paragraphs = read<ReaderParagraph[]>(`${work.id}/${section.id}.json`);
      assert.ok(paragraphs.length > 0);
      assert.equal(paragraphs.reduce((sum, paragraph) => sum + paragraph.text.length, 0), section.characters);
      for (const paragraph of paragraphs) {
        assert.ok(paragraph.text.trim());
        assert.ok(!paragraphIds.has(paragraph.id), paragraph.id);
        paragraphIds.add(paragraph.id);
        if (paragraph.stephanusReference) {
          assert.match(paragraph.stephanusReference, /^\d+[a-e]$/);
          assert.ok(!Object.hasOwn(anchors, paragraph.stephanusReference));
          anchors[paragraph.stephanusReference] = section.id;
        }
      }
    }
    assert.deepEqual({ ...anchors }, work.anchors ?? {});
  }
  assert.deepEqual([...workIds], ["apology", "euthyphro", "crito", "phaedo", "symposium", "republic"]);
  assert.equal(catalog.find(work => work.id === "republic")?.sections.length, 10);
});
