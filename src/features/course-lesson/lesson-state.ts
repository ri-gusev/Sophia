import { INTRO_LESSONS, type IntroLesson, type IntroLessonId, type LessonSceneData } from "./lesson-data";

export type ExerciseAnswer = { selected: string | null; order: readonly string[]; checked: boolean };
export type LessonRun = { sceneId: string; exercises: Record<string, ExerciseAnswer> };
export type ExerciseScene = Extract<LessonSceneData, { type: "single-choice" | "ordering" }>;

export function initialAnswer(scene: ExerciseScene): ExerciseAnswer {
  return { selected: null, order: scene.options.map(option => option.id), checked: false };
}

export function isCorrect(scene: ExerciseScene, answer: ExerciseAnswer): boolean {
  return scene.type === "single-choice" ? answer.selected === scene.correctAnswer
    : answer.order.length === scene.correctAnswer.length && answer.order.every((id, index) => id === scene.correctAnswer[index]);
}

export function moveItem(order: readonly string[], index: number, direction: -1 | 1): readonly string[] {
  const destination = index + direction;
  if (index < 0 || index >= order.length || destination < 0 || destination >= order.length) return order;
  const result = [...order];
  [result[index], result[destination]] = [result[destination], result[index]];
  return result;
}

export function lessonHash(lessonId: string, sceneId: string): string {
  return `lesson=${encodeURIComponent(lessonId)}&scene=${encodeURIComponent(sceneId)}`;
}

export function readLessonLocation(hash: string): { lessonId: IntroLessonId; sceneId: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const id = params.get("lesson");
  if (!id || !Object.hasOwn(INTRO_LESSONS, id)) return null;
  const lessonId = id as IntroLessonId;
  const lesson = INTRO_LESSONS[lessonId];
  return { lessonId, sceneId: lesson.scenes.find(scene => scene.id === params.get("scene"))?.id ?? lesson.scenes[0].id };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Treat tab storage as untrusted input; no completion or account state is persisted.
export function restoreRun(lesson: IntroLesson, saved: unknown, sceneId?: string): LessonRun {
  const data = record(saved) && saved.version === 1 ? saved : {};
  const requested = sceneId ?? data.sceneId;
  const current = lesson.scenes.find(scene => scene.id === requested) ?? lesson.scenes[0];
  const exercises: Record<string, ExerciseAnswer> = {};
  for (const scene of lesson.scenes) {
    if (scene.type !== "single-choice" && scene.type !== "ordering") continue;
    const candidate = record(data.exercises) ? data.exercises[scene.id] : null;
    if (!record(candidate)) continue;
    const ids = scene.options.map(option => option.id);
    const selected = typeof candidate.selected === "string" && ids.includes(candidate.selected) ? candidate.selected : null;
    const validOrder = Array.isArray(candidate.order) && candidate.order.length === ids.length
      && new Set(candidate.order).size === ids.length && candidate.order.every(id => typeof id === "string" && ids.includes(id));
    const order = validOrder ? candidate.order as string[] : ids;
    exercises[scene.id] = { selected, order, checked: candidate.checked === true && (scene.type === "ordering" ? validOrder : selected !== null) };
  }
  return { sceneId: current.id, exercises };
}

export const lessonStorageKey = (id: string) => `sophia:lesson:${id}:v1`;
