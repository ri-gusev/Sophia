import { calendarDay, isoDate } from "./daily-calendar";
import { questionForDay } from "./question";

export type DailyProgress = {
  lastDate: string;
  questionId: string;
  selectedIndex: number;
  streak: number;
  maxStreak: number;
};

function isOptionIndex(value: unknown): value is number {
  return value === 0 || value === 1 || value === 2;
}

function isStreak(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 3_652_425;
}

export function parseProgress(raw: string | null): DailyProgress | null {
  if (raw === null) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (typeof value !== "object" || value === null) return null;
  const { lastDate, questionId, selectedIndex, streak, maxStreak } = value as Partial<DailyProgress>;
  if (typeof lastDate !== "string" || !isOptionIndex(selectedIndex) || !isStreak(streak) || !isStreak(maxStreak) || maxStreak < streak) return null;
  const day = calendarDay(lastDate);
  if (day === null || questionId !== questionForDay(day).id) return null;
  return { lastDate, questionId, selectedIndex, streak, maxStreak };
}

export function visibleStreak(previous: DailyProgress | null, day: number) {
  const lastDay = previous ? calendarDay(previous.lastDate) : null;
  return previous && (lastDay === day || lastDay === day - 1) ? previous.streak : 0;
}

export function recordAnswer(previous: DailyProgress | null, day: number, selectedIndex: number): DailyProgress | null {
  const lastDate = isoDate(day);
  if (!isOptionIndex(selectedIndex) || (previous && previous.lastDate >= lastDate)) return null;
  const streak = visibleStreak(previous, day) + 1;
  return {
    lastDate,
    questionId: questionForDay(day).id,
    selectedIndex,
    streak,
    maxStreak: Math.max(previous?.maxStreak ?? 0, streak),
  };
}
