import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { INTRO_LESSONS, type IntroLessonId } from "../../../course-lesson/lesson-data.ts";
import { accountDb, accountTransaction } from "../../server/database.ts";
import {
  isProgressSceneId, progressLessonIds, type AccountProgress, type LessonPosition, type ProgressMutation, type ProgressResult,
} from "../contract.ts";

export type LearningProgress = {
  progress: AccountProgress;
  history: Partial<Record<IntroLessonId, { completedAt: number | null; activityOrder: number }>>;
  revision: string;
};

export function readLearningProgress(db: DatabaseSync, userId: string): LearningProgress {
  const rows = db.prepare(`
    SELECT lesson.lesson_id, lesson.completed, lesson.legacy_completed, lesson.resume_scene_id,
      lesson.completed_at, lesson.activity_order,
      slide.scene_id, (last.lesson_id = lesson.lesson_id) AS last_opened
    FROM account_lesson_progress AS lesson
    LEFT JOIN account_slide_progress AS slide USING (user_id, lesson_id)
    LEFT JOIN account_last_opened_lesson AS last USING (user_id)
    WHERE lesson.user_id = ?
  `).all(userId);
  let lastOpened: LessonPosition | null = null;
  const history: LearningProgress["history"] = {};
  const lessons = progressLessonIds.map(lessonId => {
    const entries = rows.filter(row => row.lesson_id === lessonId);
    const entry = entries[0];
    if (entry) history[lessonId] = {
      completedAt: typeof entry.completed_at === "number" ? entry.completed_at : null,
      activityOrder: Number(entry.activity_order),
    };
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
  const progress = { lessons, lastOpened };
  const revision = createHash("sha256").update(JSON.stringify([progress, history])).digest("base64url");
  return { progress, history, revision };
}

export function readProgress(db: DatabaseSync, userId: string): AccountProgress {
  return readLearningProgress(db, userId).progress;
}

export function readAccountLearningProgress(userId: string): LearningProgress {
  return readLearningProgress(accountDb(), userId);
}

function ensureLesson(db: DatabaseSync, userId: string, lessonId: IntroLessonId) {
  db.prepare(`
    INSERT INTO account_lesson_progress (user_id, lesson_id) VALUES (?, ?)
    ON CONFLICT DO NOTHING
  `).run(userId, lessonId);
}

function addConfirmation(db: DatabaseSync, userId: string, { lessonId, sceneId }: LessonPosition) {
  return db.prepare(`
    INSERT INTO account_slide_progress (user_id, lesson_id, scene_id) VALUES (?, ?, ?)
    ON CONFLICT DO NOTHING
  `).run(userId, lessonId, sceneId).changes;
}

function advanceActivityOrder(db: DatabaseSync, userId: string, lessonId: IntroLessonId) {
  db.prepare(`
    UPDATE account_lesson_progress
    SET activity_order = (SELECT MAX(activity_order) + 1 FROM account_lesson_progress WHERE user_id = ?)
    WHERE user_id = ? AND lesson_id = ?
  `).run(userId, userId, lessonId);
}

function applyMutation(db: DatabaseSync, userId: string, mutation: ProgressMutation, now?: number): string | undefined {
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
    advanceActivityOrder(db, userId, lessonId);
    return;
  }
  const confirmed = addConfirmation(db, userId, mutation);
  const completed = action === "finish" ? db.prepare(`
    UPDATE account_lesson_progress SET completed = 1, completed_at = ?
    WHERE user_id = ? AND lesson_id = ? AND completed = 0
  `).run(now ?? Date.now(), userId, lessonId).changes : 0;
  if (confirmed || completed) advanceActivityOrder(db, userId, lessonId);
}

export function applyProgressMutation(db: DatabaseSync, userId: string, mutation: ProgressMutation, now?: number): ProgressResult {
  return accountTransaction(db, () => {
    const missingSceneId = applyMutation(db, userId, mutation, now);
    const { progress, revision } = readLearningProgress(db, userId);
    return { progress, revision, missingSceneId };
  });
}
