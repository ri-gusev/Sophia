import { expect, test } from "@playwright/test";
import { completeLesson, LESSON_PROGRESS_EVENT, LESSON_PROGRESS_KEY, readCompletedLessons } from "../src/features/course-lesson/lesson-progress";

test.describe("local lesson progress", () => {
  const backupKey = `${LESSON_PROGRESS_KEY}.corrupt`;
  let records: Map<string, string>;
  let events: EventTarget;
  let fired: number;
  let denied: "read" | "write" | undefined;

  test.beforeEach(() => {
    records = new Map();
    events = new EventTarget();
    fired = 0;
    denied = undefined;
    events.addEventListener(LESSON_PROGRESS_EVENT, () => fired++);
    Object.defineProperty(globalThis, "window", { configurable: true, value: events });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem(key: string) {
          if (denied === "read") throw new DOMException("Read denied", "SecurityError");
          return records.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          if (denied === "write") throw new DOMException("Write denied", "QuotaExceededError");
          records.set(key, value);
        },
      },
    });
  });

  test.afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  test("reads an absent key as empty", () => {
    records.set(backupKey, '["backup"]');
    expect(readCompletedLessons()).toEqual([]);
  });

  test("preserves other IDs, filters invalid entries and deduplicates", () => {
    records.set(LESSON_PROGRESS_KEY, '["socrates","socrates",2,null,{},"other"]');
    expect(readCompletedLessons()).toEqual(["socrates", "other"]);
    completeLesson("virtue");
    completeLesson("virtue");
    expect(records.get(LESSON_PROGRESS_KEY)).toBe('["socrates","other","virtue"]');
    expect(fired).toBe(2);
  });

  for (const raw of ["[broken", '{"id":"other"}']) {
    test(`preserves invalid data before replacing ${raw}`, () => {
      records.set(LESSON_PROGRESS_KEY, raw);
      expect(readCompletedLessons()).toEqual([]);
      expect(records.get(LESSON_PROGRESS_KEY)).toBe(raw);
      expect(records.has(backupKey)).toBe(false);
      completeLesson("virtue");
      expect(records.get(backupKey)).toBe(raw);
      expect(readCompletedLessons()).toEqual(["virtue"]);
      expect(fired).toBe(1);
    });
  }

  test("propagates denied reads and writes without signaling completion", () => {
    records.set(LESSON_PROGRESS_KEY, "[broken");
    denied = "read";
    expect(() => readCompletedLessons()).toThrow("Read denied");
    expect(() => completeLesson("virtue")).toThrow("Read denied");
    denied = "write";
    expect(() => completeLesson("virtue")).toThrow("Write denied");
    expect(records.get(LESSON_PROGRESS_KEY)).toBe("[broken");
    expect(records.has(backupKey)).toBe(false);
    records.set(LESSON_PROGRESS_KEY, '["socrates"]');
    expect(() => completeLesson("virtue")).toThrow("Write denied");
    expect(readCompletedLessons()).toEqual(["socrates"]);
    expect(fired).toBe(0);
  });
});
