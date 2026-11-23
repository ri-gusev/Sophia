// Shared local completion record. No account or server synchronization.
export const LESSON_PROGRESS_KEY = "sophia.lesson-completions.v1";
export const LESSON_PROGRESS_EVENT = "sophia:lesson-progress";

function parseCompletedLessons(raw: string | null): string[] | null {
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  if (!Array.isArray(parsed)) return null;
  return [...new Set(parsed.filter((id): id is string => typeof id === "string"))];
}

export function readCompletedLessons(): string[] {
  return parseCompletedLessons(localStorage.getItem(LESSON_PROGRESS_KEY)) ?? [];
}

export function completeLesson(id: string): void {
  const raw = localStorage.getItem(LESSON_PROGRESS_KEY);
  const completed = parseCompletedLessons(raw);
  if (raw !== null && completed === null) {
    localStorage.setItem(`${LESSON_PROGRESS_KEY}.corrupt`, raw);
  }
  const ids = completed ?? [];
  if (!ids.includes(id)) localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify([...ids, id]));
  window.dispatchEvent(new Event(LESSON_PROGRESS_EVENT));
}
