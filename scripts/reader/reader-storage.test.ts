import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { clearAccountLessonStorage } from "../../src/features/course-lesson/lesson-resume.ts";
import { createReaderLocalStore, readerStorageKey } from "../../src/features/reader/reader-local-store.ts";

const firstPosition = { sectionId: "opening", paragraphId: "paragraph-1", fraction: 0.25 };
const laterPosition = { sectionId: "closing", paragraphId: "paragraph-8", fraction: 0.8 };
const firstBookmark = { ...firstPosition, workId: "phaedo", excerpt: "Opening passage", reference: "57a" };
const laterBookmark = { ...laterPosition, workId: "phaedo", excerpt: "Further passage", reference: "116a" };
const firstQuote = {
  workId: "phaedo", sectionId: "opening", startParagraphId: "paragraph-1", endParagraphId: "paragraph-1",
  startOffset: 7, endOffset: 11, text: "  Я ", reference: "57a", edition: "karpov",
};
const secondQuote = { ...firstQuote, startOffset: 9, endOffset: 15, text: "Я здесь" };

let browser: EventTarget;
let storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;

beforeEach(() => {
  const values: Record<string, string> = {};
  storage = {
    getItem(key) { return values[key] ?? null; },
    setItem(key, value) {
      values[key] = value;
      Object.defineProperty(this, key, { value, configurable: true, enumerable: true });
    },
    removeItem(key) {
      delete values[key];
      Reflect.deleteProperty(this, key);
    },
  };
  browser = Object.assign(new EventTarget(), { localStorage: storage });
  Object.defineProperty(globalThis, "window", { value: browser, configurable: true });
});

test("a backward jump updates resume without reducing progress or marking the work complete", () => {
  const reader = createReaderLocalStore(null);
  reader.savePosition("phaedo", laterPosition, 100);
  reader.savePosition("phaedo", firstPosition, 5);

  const reopened = createReaderLocalStore(null).getSnapshot().works.phaedo;
  assert.ok(reopened);
  assert.deepEqual(reopened.position, { ...firstPosition, percent: 5 });
  assert.equal(reopened.maxProgress, 100);
  assert.equal(reopened.completed, false);
  assert.ok(reopened.lastActivityAt && Number.isFinite(Date.parse(reopened.lastActivityAt)));

  reader.setCompleted("phaedo");
  assert.equal(createReaderLocalStore(null).getSnapshot().works.phaedo?.completed, true);
  assert.deepEqual(reader.getSnapshot().works.phaedo?.position, { ...firstPosition, percent: 5 });
});

test("guest and account scopes persist separately and account erasure blocks stale writes", () => {
  const guest = createReaderLocalStore(null);
  const first = createReaderLocalStore("first");
  const second = createReaderLocalStore("second");
  guest.savePosition("phaedo", firstPosition, 5);
  first.savePosition("phaedo", laterPosition, 95);
  first.updateSettings({ theme: "dark" });
  second.addBookmark(firstBookmark);

  assert.deepEqual(createReaderLocalStore(null).getSnapshot().works.phaedo?.position, { ...firstPosition, percent: 5 });
  assert.equal(createReaderLocalStore("first").getSnapshot().settings.theme, "dark");
  assert.equal(createReaderLocalStore("second").getSnapshot().works.phaedo, undefined);

  clearAccountLessonStorage("first");
  first.savePosition("phaedo", laterPosition, 99);
  assert.equal(storage.getItem(readerStorageKey("first")), null);
  assert.equal(first.getSnapshot().works.phaedo, undefined);
  assert.equal(guest.getSnapshot().works.phaedo?.maxProgress, 5);
  assert.equal(second.getSnapshot().bookmarks.length, 1);
});

test("an unavailable account lookup keeps reading usable without opening or modifying guest data", () => {
  const guest = createReaderLocalStore(null);
  const unavailable = createReaderLocalStore(undefined);
  guest.updateSettings({ theme: "dark" });
  assert.equal(unavailable.getSnapshot().settings.theme, "paper");

  unavailable.savePosition("phaedo", firstPosition, 5);
  assert.equal(unavailable.getSnapshot().works.phaedo?.maxProgress, 5);
  assert.equal(createReaderLocalStore(undefined).getSnapshot().works.phaedo, undefined);
  assert.equal(createReaderLocalStore(null).getSnapshot().works.phaedo, undefined);
  assert.equal(createReaderLocalStore(null).getSnapshot().settings.theme, "dark");
});

test("multiple bookmarks persist, de-duplicate by work and paragraph, and can be removed individually", () => {
  const reader = createReaderLocalStore(null);
  reader.addBookmark(firstBookmark);
  reader.addBookmark({ ...firstBookmark, excerpt: "Duplicate" });
  reader.addBookmark(laterBookmark);
  reader.addBookmark({ ...firstBookmark, workId: "other-work" });
  reader.removeBookmark("phaedo", firstBookmark.paragraphId);

  const bookmarks = createReaderLocalStore(null).getSnapshot().bookmarks;
  assert.deepEqual(bookmarks.map(({ workId, paragraphId, excerpt, reference }) => ({
    workId, paragraphId, excerpt, reference,
  })), [
    { workId: "other-work", paragraphId: "paragraph-1", excerpt: "Opening passage", reference: "57a" },
    { workId: "phaedo", paragraphId: "paragraph-8", excerpt: "Further passage", reference: "116a" },
  ]);
  assert.ok(bookmarks.every(({ createdAt }) => Number.isFinite(Date.parse(createdAt))));
});

test("corrupt data recovers and blocked writes keep settings usable in the document", () => {
  storage.setItem(readerStorageKey(null), "{broken");
  const reader = createReaderLocalStore(null);
  assert.equal(reader.getSnapshot().settings.theme, "paper");
  reader.updateSettings({ theme: "dark", fontSize: 35, lineHeight: 0 });
  assert.deepEqual(createReaderLocalStore(null).getSnapshot().settings, { theme: "dark", fontSize: 28, lineHeight: 1.2 });

  storage.setItem = () => { throw new Error("Storage disabled"); };
  reader.updateSettings({ theme: "light" });
  assert.deepEqual(reader.getSnapshot().settings, { theme: "light", fontSize: 28, lineHeight: 1.2 });
});

test("changes in another browser document refresh subscribed snapshots and survive subsequent edits", () => {
  const reader = createReaderLocalStore(null);
  const other = createReaderLocalStore(null);
  reader.savePosition("phaedo", firstPosition, 5);
  let notifications = 0;
  const unsubscribe = reader.subscribe(() => { notifications++; });
  other.addBookmark(laterBookmark);
  browser.dispatchEvent(Object.assign(new Event("storage"), { key: readerStorageKey(null) }));

  assert.equal(notifications, 1);
  assert.equal(reader.getSnapshot().bookmarks[0].paragraphId, laterPosition.paragraphId);
  reader.updateSettings({ fontSize: 23 });
  assert.equal(other.getSnapshot().settings.fontSize, 23);
  assert.equal(other.getSnapshot().works.phaedo?.maxProgress, 5);
  assert.equal(other.getSnapshot().bookmarks.length, 1);
  unsubscribe();
});

test("v1 bookmarks and reading positions remain available and gain optional exact locations", () => {
  const key = readerStorageKey(null);
  const savedAt = "2026-11-26T12:34:56.789Z";
  storage.setItem(key, JSON.stringify({
    settings: { theme: "dark", fontSize: 22, lineHeight: 1.9 },
    works: { phaedo: { position: firstPosition, maxProgress: 96, lastActivityAt: savedAt, completed: true } },
    bookmarks: [{
      workId: "phaedo", sectionId: "opening", paragraphId: "paragraph-1", excerpt: "Opening passage",
      reference: "57a", createdAt: savedAt,
    }],
  }));
  const reader = createReaderLocalStore(null);
  assert.deepEqual(reader.getSnapshot().bookmarks[0], {
    ...firstBookmark, fraction: 0, createdAt: savedAt,
  });
  assert.deepEqual(reader.getSnapshot().works.phaedo?.position, firstPosition);

  const exactLocation = { ...laterPosition, offset: 212, reference: "116a" };
  reader.savePosition("phaedo", exactLocation, 92, 14);
  reader.addBookmark({ ...laterBookmark, offset: exactLocation.offset });
  const reopened = createReaderLocalStore(null).getSnapshot();
  assert.deepEqual(reopened.works.phaedo?.position, { ...exactLocation, percent: 14 });
  assert.equal(reopened.works.phaedo?.maxProgress, 96);
  assert.equal(reopened.works.phaedo?.completed, true);
  assert.deepEqual(reopened.settings, { theme: "dark", fontSize: 22, lineHeight: 1.9 });
  assert.equal(reopened.bookmarks[0].fraction, 0.8);
  assert.equal(reopened.bookmarks[0].offset, 212);
  assert.equal(reopened.bookmarks[1].createdAt, savedAt);
});

test("quotes preserve the exact selected text, allow overlapping ranges, and reject duplicates", () => {
  const reader = createReaderLocalStore(null);
  assert.equal(reader.addQuote(firstQuote), true);
  assert.equal(reader.addQuote({ ...firstQuote, text: "different content for the same range" }), false);
  assert.equal(reader.addQuote(secondQuote), true);

  const reopened = createReaderLocalStore(null);
  const saved = reopened.getSnapshot().quotes.find(quote => quote.startOffset === 7);
  assert.ok(saved);
  assert.equal(saved.text, "  Я ");
  assert.ok(Number.isFinite(Date.parse(saved.createdAt)));
  assert.equal(reopened.getSnapshot().quotes.length, 2);
  reopened.removeQuote(saved.id);
  assert.deepEqual(createReaderLocalStore(null).getSnapshot().quotes.map(quote => quote.text), ["Я здесь"]);
});

test("interleaved quotes, progress, and bookmarks from different tabs persist independently", () => {
  const first = createReaderLocalStore(null);
  const second = createReaderLocalStore(null);
  let interleaved = false;
  const originalSet = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    if (!interleaved) {
      interleaved = true;
      second.addQuote(secondQuote);
      second.savePosition("phaedo", laterPosition, 95);
      second.addBookmark(laterBookmark);
    }
    originalSet(key, value);
  };

  first.addQuote(firstQuote);
  const reopened = createReaderLocalStore(null).getSnapshot();
  assert.deepEqual(new Set(reopened.quotes.map(quote => quote.startOffset)), new Set([7, 9]));
  assert.deepEqual(reopened.works.phaedo?.position, { ...laterPosition, percent: 95 });
  assert.equal(reopened.bookmarks[0].paragraphId, laterBookmark.paragraphId);
});

test("quote storage events update open documents and deleting an account removes only its quotes", () => {
  const guest = createReaderLocalStore(null);
  const writingTab = createReaderLocalStore("quote-owner");
  const readingTab = createReaderLocalStore("quote-owner");
  guest.addQuote(firstQuote);
  const unsubscribe = readingTab.subscribe(() => {});
  assert.equal(readingTab.getSnapshot().quotes.length, 0);
  writingTab.addQuote(secondQuote);
  const key = Object.keys(storage).find(candidate => candidate.includes("quote-owner"));
  assert.ok(key);
  browser.dispatchEvent(Object.assign(new Event("storage"), { key }));
  assert.equal(readingTab.getSnapshot().quotes[0].text, secondQuote.text);

  clearAccountLessonStorage("quote-owner");
  assert.equal(writingTab.addQuote(firstQuote), false);
  assert.equal(storage.getItem(key), null);
  assert.equal(readingTab.getSnapshot().quotes.length, 0);
  assert.equal(guest.getSnapshot().quotes.length, 1);
  unsubscribe();
});
