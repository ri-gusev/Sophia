import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteText, resolveQuote, precedingReference } from "../../src/features/reader/reader-quotes.ts";

const paragraphs = [
  { id: "a", speaker: "Сократ", text: "Будем искать вместе.", stephanusReference: "70a" },
  { id: "b", text: "Я готов." },
  { id: "c", text: "Начнём с вопроса.", stephanusReference: "70b" },
];

test("quote keeps exact partial text, dialogue names, paragraph boundaries and prior reference", () => {
  const bounds = { startParagraphId: "a", endParagraphId: "b", startOffset: 7, endOffset: 7 };
  assert.equal(quoteText(paragraphs, bounds), "Будем искать вместе.\n\nЯ готов");
  assert.equal(quoteText(paragraphs, { ...bounds, startOffset: 0 }), "Сократ Будем искать вместе.\n\nЯ готов");
  assert.equal(precedingReference(paragraphs, "b"), "70a");
});

test("quote recovery requires exact unchanged text, and matches relocated text only if unique", () => {
  const quote = {
    text: "искать", edition: "1863", startParagraphId: "a", endParagraphId: "a", startOffset: 13, endOffset: 19,
  };
  assert.deepEqual(resolveQuote(paragraphs, quote, "1863"), {
    startParagraphId: "a", endParagraphId: "a", startOffset: 13, endOffset: 19,
  });
  const changed = [{ id: "new-a", text: "Снова искать." }];
  assert.deepEqual(resolveQuote(changed, quote, "revision"), {
    startParagraphId: "new-a", endParagraphId: "new-a", startOffset: 6, endOffset: 12,
  });
  assert.equal(resolveQuote([{ id: "z", text: "искать и искать" }], quote, "revision"), null);
  assert.equal(resolveQuote([{ id: "a", text: "текст изменился полностью" }], quote, "revision"), null);
});
