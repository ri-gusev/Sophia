import { INTRO_LESSONS, type IntroLessonId } from "../../course-lesson/lesson-data.ts";

export const PROGRESS_BODY_LIMIT = 8 * 1024;
export const EXPECTED_PROGRESS_ACCOUNT_HEADER = "X-Sophia-Account";
export const progressLessonIds = Object.keys(INTRO_LESSONS) as IntroLessonId[];

export type LessonPosition = { lessonId: IntroLessonId; sceneId: string };
export type LessonProgress = {
  lessonId: IntroLessonId;
  confirmedSceneIds: readonly string[];
  completed: boolean;
  legacyCompleted: boolean;
  resumeSceneId: string | null;
};
export type AccountProgress = {
  lessons: readonly LessonProgress[];
  lastOpened: LessonPosition | null;
};
export type ProgressMutation =
  | ({ action: "confirm" | "finish" | "resume" } & LessonPosition)
  | ({ action: "import" } & AccountProgress);
export type ProgressResult = { progress: AccountProgress; revision: string; missingSceneId?: string };
export type ProgressResponse = ProgressResult & { accountId: string };

export function isProgressLessonId(value: unknown): value is IntroLessonId {
  return typeof value === "string" && Object.hasOwn(INTRO_LESSONS, value);
}

export function isProgressSceneId(lessonId: IntroLessonId, value: unknown): value is string {
  return INTRO_LESSONS[lessonId].scenes.some(scene => scene.id === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(record).every(key => keys.includes(key));
}

export function parseLessonPosition(value: unknown): LessonPosition | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ["lessonId", "sceneId"])) return null;
  const { lessonId, sceneId } = value;
  return isProgressLessonId(lessonId) && isProgressSceneId(lessonId, sceneId) ? { lessonId, sceneId } : null;
}

function parseImportLesson(value: unknown): LessonProgress | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ["lessonId", "confirmedSceneIds", "completed", "legacyCompleted", "resumeSceneId"])) return null;
  const { lessonId, confirmedSceneIds, completed, legacyCompleted, resumeSceneId } = value;
  if (!isProgressLessonId(lessonId) || !Array.isArray(confirmedSceneIds) || typeof completed !== "boolean"
    || typeof legacyCompleted !== "boolean" || (resumeSceneId !== null && !isProgressSceneId(lessonId, resumeSceneId))) return null;
  const { scenes } = INTRO_LESSONS[lessonId];
  if (confirmedSceneIds.length > scenes.length || !confirmedSceneIds.every(id => isProgressSceneId(lessonId, id))
    || new Set(confirmedSceneIds).size !== confirmedSceneIds.length
    || (completed && confirmedSceneIds.length !== scenes.length)) return null;
  return { lessonId, confirmedSceneIds, completed, legacyCompleted, resumeSceneId };
}

export function parseProgressMutation(body: Record<string, unknown>): ProgressMutation | null {
  const { action, lessonId, sceneId } = body;
  if (action === "confirm" || action === "finish" || action === "resume") {
    if (!hasOnlyKeys(body, ["expectedAccountId", "action", "lessonId", "sceneId"])) return null;
    const position = parseLessonPosition({ lessonId, sceneId });
    if (!position) return null;
    const final = INTRO_LESSONS[position.lessonId].scenes.at(-1)?.id === position.sceneId;
    if ((action === "confirm" && final) || (action === "finish" && !final)) return null;
    return { action, ...position };
  }

  if (action !== "import" || !hasOnlyKeys(body, ["expectedAccountId", "action", "lessons", "lastOpened"])) return null;
  if (!Array.isArray(body.lessons) || body.lessons.length === 0 || body.lessons.length > progressLessonIds.length) return null;
  const lessons: LessonProgress[] = [];
  for (const item of body.lessons) {
    const lesson = parseImportLesson(item);
    if (!lesson || lessons.some(entry => entry.lessonId === lesson.lessonId)) return null;
    lessons.push(lesson);
  }
  const lastOpened = body.lastOpened == null ? null : parseLessonPosition(body.lastOpened);
  if (body.lastOpened != null && (!lastOpened || !lessons.some(lesson =>
    lesson.lessonId === lastOpened.lessonId && lesson.resumeSceneId === lastOpened.sceneId))) return null;
  return { action, lessons, lastOpened };
}
