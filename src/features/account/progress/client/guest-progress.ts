import { INTRO_LESSONS } from "../../../course-lesson/lesson-data.ts";
import { LESSON_PROGRESS_KEY, parseCompletedLessons } from "../../../course-lesson/lesson-progress.ts";
import { readGuestLastOpened, readGuestResumeScene } from "../../../course-lesson/lesson-resume.ts";
import { finishKey, slideKey } from "../../../course-lesson/lesson-slide-progress.ts";
import { isProgressSceneId, parseLessonPosition, progressLessonIds, type AccountProgress, type LessonProgress } from "../contract.ts";

const LEGACY_COMPLETIONS_LIMIT = 4096;
const RESUME_RECORD_LIMIT = 128 * 1024;
const POSITION_LIMIT = 256;

export function collectGuestProgress(getItem: (key: string) => string | null): AccountProgress | null {
  try {
    const readPositionRecord = (key: string): unknown => {
      const value = getItem(key);
      const limit = key.startsWith("sophia.lesson-resume.v1:") ? RESUME_RECORD_LIMIT : POSITION_LIMIT;
      if (value === null || value.length > limit) return null;
      try { return JSON.parse(value); } catch { return null; }
    };
    const legacy = getItem(LESSON_PROGRESS_KEY);
    const legacyCompletedLessons = new Set(legacy !== null && legacy.length <= LEGACY_COMPLETIONS_LIMIT ? parseCompletedLessons(legacy) : []);
    const lessons: LessonProgress[] = [];
    for (const lessonId of progressLessonIds) {
      const { scenes } = INTRO_LESSONS[lessonId];
      const confirmedSceneIds = scenes.filter(scene => getItem(slideKey(lessonId, scene.id)) === "1").map(scene => scene.id);
      const completed = confirmedSceneIds.length === scenes.length && getItem(finishKey(lessonId)) === "1";
      const legacyCompleted = legacyCompletedLessons.has(lessonId);
      const resume = readGuestResumeScene(lessonId, readPositionRecord);
      const resumeSceneId = isProgressSceneId(lessonId, resume) ? resume : null;
      if (confirmedSceneIds.length || completed || legacyCompleted || resumeSceneId) {
        lessons.push({ lessonId, confirmedSceneIds, completed, legacyCompleted, resumeSceneId });
      }
    }
    if (!lessons.length) return null;
    const latest = parseLessonPosition(readGuestLastOpened(readPositionRecord));
    const lastOpened = latest && lessons.some(lesson => lesson.lessonId === latest.lessonId && lesson.resumeSceneId === latest.sceneId) ? latest : null;
    return { lessons, lastOpened };
  } catch {
    return null;
  }
}
