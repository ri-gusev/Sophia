import type { DatabaseSync } from "node:sqlite";
import { INTRO_LESSONS, type IntroLessonId } from "../../../course-lesson/lesson-data.ts";
import { accountDb, accountTransaction } from "../../server/database.ts";
import {
  isProgressSceneId, progressLessonIds, type AccountProgress, type LessonPosition, type ProgressMutation, type ProgressResult,
} from "../contract.ts";

export function readProgress(db: DatabaseSync, userId: string): AccountProgress {
  const rows = db.prepare(`
    SELECT lesson.lesson_id, lesson.completed, lesson.legacy_completed, lesson.resume_scene_id,
      slide.scene_id, (last.lesson_id = lesson.lesson_id) AS last_opened
    FROM account_lesson_progress AS lesson
    LEFT JOIN account_slide_progress AS slide USING (user_id, lesson_id)
    LEFT JOIN account_last_opened_lesson AS last USING (user_id)
    WHERE lesson.user_id = ?
  `).all(userId);
  let lastOpened: LessonPosition | null = null;
  const lessons = progressLessonIds.map(lessonId => {
    const entries = rows.filter(row => row.lesson_id === lessonId);
    const entry = entries[0];
    const { scenes } = INTRO_LESSONS[lessonId];
    const confirmedSceneIds = scenes.filter(scene => entries.some(row => row.scene_id === scene.id)).map(scene => scene.id);
    const resume = entry?.resume_scene_id;
    const resumeSceneId = isProgressSceneId(lessonId, resume) ? resume : null;
    if (entry?.last_opened === 1 && resumeSceneId) lastOpened = { lessonId, sceneId: resumeSceneId };
    return {
      lessonId, confirmedSceneIds, completed: entry?.completed === 1 && confirmedSceneIds.length === scenes.length,
      legacyCompleted: entry?.legacy_completed === 1, resumeSceneId,
    };
  });
  return { lessons, lastOpened };
}

export function readAccountProgress(userId: string): AccountProgress {
  return readProgress(accountDb(), userId);
}

function ensureLesson(db: DatabaseSync, userId: string, lessonId: IntroLessonId) {
  db.prepare(`
    INSERT INTO account_lesson_progress (user_id, lesson_id) VALUES (?, ?)
    ON CONFLICT DO NOTHING
  `).run(userId, lessonId);
}

function addConfirmation(db: DatabaseSync, userId: string, { lessonId, sceneId }: LessonPosition) {
  db.prepare(`
    INSERT INTO account_slide_progress (user_id, lesson_id, scene_id) VALUES (?, ?, ?)
    ON CONFLICT DO NOTHING
  `).run(userId, lessonId, sceneId);
}

function applyMutation(db: DatabaseSync, userId: string, mutation: ProgressMutation): string | undefined {
  if (mutation.action === "import") {
    const upsert = db.prepare(`
      INSERT INTO account_lesson_progress (user_id, lesson_id, completed, legacy_completed, resume_scene_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        completed = MAX(completed, excluded.completed),
        legacy_completed = MAX(legacy_completed, excluded.legacy_completed),
        resume_scene_id = COALESCE(resume_scene_id, excluded.resume_scene_id)
    `);
    const addSlide = db.prepare(`
      INSERT INTO account_slide_progress (user_id, lesson_id, scene_id) VALUES (?, ?, ?)
      ON CONFLICT DO NOTHING
    `);
    for (const lesson of mutation.lessons) {
      upsert.run(userId, lesson.lessonId, Number(lesson.completed), Number(lesson.legacyCompleted), lesson.resumeSceneId);
      for (const sceneId of lesson.confirmedSceneIds) addSlide.run(userId, lesson.lessonId, sceneId);
    }
    if (mutation.lastOpened) db.prepare(`
      INSERT INTO account_last_opened_lesson (user_id, lesson_id) VALUES (?, ?)
      ON CONFLICT DO NOTHING
    `).run(userId, mutation.lastOpened.lessonId);
    return;
  }

  const { lessonId, sceneId, action } = mutation;
  const scenes = INTRO_LESSONS[lessonId].scenes;
  const final = scenes.at(-1)?.id === sceneId;
  if (!isProgressSceneId(lessonId, sceneId) || (action === "confirm" && final) || (action === "finish" && !final)) {
    throw new RangeError("Invalid lesson progress");
  }
  if (action === "finish") {
    const confirmed = new Set(db.prepare(`
      SELECT scene_id FROM account_slide_progress WHERE user_id = ? AND lesson_id = ?
    `).all(userId, lessonId).map(row => row.scene_id));
    const missing = scenes.slice(0, -1).find(scene => !confirmed.has(scene.id));
    if (missing) return missing.id;
  }
  ensureLesson(db, userId, lessonId);
  if (action === "resume") {
    db.prepare("UPDATE account_lesson_progress SET resume_scene_id = ? WHERE user_id = ? AND lesson_id = ?").run(sceneId, userId, lessonId);
    db.prepare(`
      INSERT INTO account_last_opened_lesson (user_id, lesson_id) VALUES (?, ?)
      ON CONFLICT (user_id) DO UPDATE SET lesson_id = excluded.lesson_id
    `).run(userId, lessonId);
    return;
  }
  addConfirmation(db, userId, mutation);
  if (action === "finish") db.prepare("UPDATE account_lesson_progress SET completed = 1 WHERE user_id = ? AND lesson_id = ?").run(userId, lessonId);
}

export function applyProgressMutation(db: DatabaseSync, userId: string, mutation: ProgressMutation): ProgressResult {
  return accountTransaction(db, () => {
    const missingSceneId = applyMutation(db, userId, mutation);
    return { progress: readProgress(db, userId), missingSceneId };
  });
}
