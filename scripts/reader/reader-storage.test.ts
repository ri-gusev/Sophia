import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { clearAccountLessonStorage } from "../../src/features/course-lesson/lesson-resume.ts";
import { createReaderLocalStore, readerStorageKey } from "../../src/features/reader/reader-local-store.ts";

const firstPosition = { sectionId: "opening", paragraphId: "paragraph-1", fraction: 0.25 };
const laterPosition = { sectionId: "closing", paragraphId: "paragraph-8", fraction: 0.8 };
const firstBookmark = { ...firstPosition, workId: "phaedo", excerpt: "Opening passage", reference: "57a" };
const laterBookmark = { ...laterPosition, workId: "phaedo", excerpt: "Further passage", reference: "116a" };

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
  assert.deepEqual(reopened.position, firstPosition);
  assert.equal(reopened.maxProgress, 100);
  assert.equal(reopened.completed, false);
  assert.ok(reopened.lastActivityAt && Number.isFinite(Date.parse(reopened.lastActivityAt)));

  reader.setCompleted("phaedo");
  assert.equal(createReaderLocalStore(null).getSnapshot().works.phaedo?.completed, true);
  assert.deepEqual(reader.getSnapshot().works.phaedo?.position, firstPosition);
});

test("guest and account scopes persist separately and account erasure blocks stale writes", () => {
  const guest = createReaderLocalStore(null);
  const first = createReaderLocalStore("first");
  const second = createReaderLocalStore("second");
  guest.savePosition("phaedo", firstPosition, 5);
  first.savePosition("phaedo", laterPosition, 95);
  first.updateSettings({ theme: "dark" });
  second.addBookmark(firstBookmark);

  assert.deepEqual(createReaderLocalStore(null).getSnapshot().works.phaedo?.position, firstPosition);
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
