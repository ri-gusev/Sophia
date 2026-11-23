import type { IntroLesson } from "./lesson-data";
import { LESSON_PROGRESS_EVENT, LESSON_PROGRESS_KEY } from "./lesson-progress";

export const SLIDE_PROGRESS_PREFIX = "sophia.lesson-progress.v2:";
const slideKey = (lessonId: string, sceneId: string) =>
  `${SLIDE_PROGRESS_PREFIX}slide:${encodeURIComponent(lessonId)}:${encodeURIComponent(sceneId)}`;
const finishKey = (lessonId: string) => `${SLIDE_PROGRESS_PREFIX}finished:${encodeURIComponent(lessonId)}`;

export function subscribeLessonProgress(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (!event.key || event.key === LESSON_PROGRESS_KEY || event.key.startsWith(SLIDE_PROGRESS_PREFIX)) onChange();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(LESSON_PROGRESS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LESSON_PROGRESS_EVENT, onChange);
  };
}

export function confirmedSlides(lesson: IntroLesson) {
  return lesson.scenes.filter(scene => localStorage.getItem(slideKey(lesson.id, scene.id)) === "1").map(scene => scene.id);
}

function confirmSlide(lessonId: string, sceneId: string) {
  const key = slideKey(lessonId, sceneId);
  if (localStorage.getItem(key) !== "1") localStorage.setItem(key, "1");
}

function announceProgress() {
  window.dispatchEvent(new Event(LESSON_PROGRESS_EVENT));
}

export function confirmSlideTransition(lesson: IntroLesson, sceneId: string) {
  confirmSlide(lesson.id, sceneId);
  announceProgress();
}

export function finishLesson(lesson: IntroLesson, sceneId: string) {
  if (lesson.scenes.at(-1)?.id !== sceneId) return;
  const missing = lesson.scenes.slice(0, -1)
    .find(scene => localStorage.getItem(slideKey(lesson.id, scene.id)) !== "1");
  if (missing) return { missing: missing.id };
  confirmSlide(lesson.id, sceneId);
  const key = finishKey(lesson.id);
  if (localStorage.getItem(key) !== "1") localStorage.setItem(key, "1");
  announceProgress();
  return { missing: null };
}

export function isLessonConfirmed(lesson: IntroLesson) {
  return localStorage.getItem(finishKey(lesson.id)) === "1"
    && confirmedSlides(lesson).length === lesson.scenes.length;
}
