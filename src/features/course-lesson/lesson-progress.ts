// Shared local completion record. No account or server synchronization.
export const LESSON_PROGRESS_KEY = "sophia.lesson-completions.v1";
export const LESSON_PROGRESS_EVENT = "sophia:lesson-progress";
export function readCompletedLessons(): string[] {
  const raw: unknown = JSON.parse(localStorage.getItem(LESSON_PROGRESS_KEY) ?? "[]");
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === "string"))];
}
export function completeLesson(id: string): void {
  const completed = readCompletedLessons();
  if (!completed.includes(id)) localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify([...completed, id]));
  window.dispatchEvent(new Event(LESSON_PROGRESS_EVENT));
}
