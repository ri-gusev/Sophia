import { expect, test } from "@playwright/test";
import { cycleStartDay, getMoscowDay, isoDate, nextMoscowMidnight } from "../src/features/philosophy-question/daily-calendar";
import { dailyQuestions, questionForDay } from "../src/features/philosophy-question/question";
import { parseProgress, recordAnswer, visibleStreak } from "../src/features/philosophy-question/daily-streak";

test("the supplied corpus contains exactly 250 structurally sound and unique entries", () => {
  const normalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  expect(dailyQuestions).toHaveLength(250);
  expect(new Set(dailyQuestions.map(question => question.id)).size).toBe(250);
  expect(new Set(dailyQuestions.map(question => normalize(question.question))).size).toBe(250);
  for (const [index, question] of dailyQuestions.entries()) {
    expect(question.id).toBe(`philosophy-${String(index + 1).padStart(3, "0")}`);
    expect(Array.isArray(question.options)).toBe(true);
    expect(question.options).toHaveLength(3);
    expect(new Set(question.options.map(normalize)).size).toBe(3);
    expect([0, 1, 2]).toContain(question.correctIndex);
    for (const value of [question.category, question.question, ...question.options, question.explanation, question.source, question.reference]) {
      expect(value.trim()).not.toBe("");
    }
    expect(new URL(question.sourceUrl).protocol).toBe("https:");
  }
});

test("each full cycle uses each ID once and repeats after exactly 250 Moscow dates", () => {
  const previousDay = questionForDay(cycleStartDay - 1);
  expect(isoDate(cycleStartDay)).toBe("2026-11-25");
  expect(previousDay.id).toBe("philosophy-250");
  const ids = Array.from({ length: 250 }, (_, index) => questionForDay(cycleStartDay + index).id);
  expect(new Set(ids).size).toBe(250);
  expect(questionForDay(cycleStartDay + 250).id).toBe(ids[0]);
});

test("the Moscow day and next midnight cross month, year and leap-day boundaries", () => {
  for (const [before, after, date] of [
    ["2026-11-30T20:59:59.999Z", "2026-11-30T21:00:00.000Z", "2026-12-01"],
    ["2026-12-31T20:59:59.999Z", "2026-12-31T21:00:00.000Z", "2027-01-01"],
    ["2028-02-28T20:59:59.999Z", "2028-02-28T21:00:00.000Z", "2028-02-29"],
    ["2028-02-29T20:59:59.999Z", "2028-02-29T21:00:00.000Z", "2028-03-01"],
  ]) {
    const previous = getMoscowDay(Date.parse(before));
    const current = getMoscowDay(Date.parse(after));
    expect(isoDate(current)).toBe(date);
    expect(current).toBe(previous + 1);
    expect(nextMoscowMidnight(previous)).toBe(Date.parse(after));
  }
});

test("streak rules are idempotent and preserve the record after a missed day", () => {
  const first = recordAnswer(null, cycleStartDay, 0);
  expect(first).toMatchObject({ lastDate: "2026-11-25", questionId: "philosophy-001", selectedIndex: 0, streak: 1, maxStreak: 1 });
  expect(parseProgress(JSON.stringify(first))).toEqual(first);
  expect(recordAnswer(first, cycleStartDay, 1)).toBeNull();
  expect(visibleStreak(first, cycleStartDay + 1)).toBe(1);
  const second = recordAnswer(first, cycleStartDay + 1, 2);
  expect(second).toMatchObject({ streak: 2, maxStreak: 2 });
  expect(visibleStreak(second, cycleStartDay + 3)).toBe(0);
  expect(recordAnswer(second, cycleStartDay + 3, 0)).toMatchObject({ streak: 1, maxStreak: 2 });
  expect(recordAnswer(second, cycleStartDay, 0)).toBeNull();
  for (const corrupt of [null, "{", "[]", JSON.stringify({ ...first, questionId: "philosophy-250" }),
    JSON.stringify({ ...first, lastDate: "2026-02-30" }), JSON.stringify({ ...first, selectedIndex: 3 }),
    JSON.stringify({ ...first, maxStreak: 0 }), JSON.stringify({ ...first, streak: -1 })]) {
    expect(parseProgress(corrupt)).toBeNull();
  }
});
