import { accountStoragePrefix as accountPrefix } from "../account/account-storage.ts";

// Exercises and scroll are local, with separate guest and account namespaces.
const LEGACY_PREFIX = "sophia.lesson-resume.v1:";
const PREFIX = "sophia.lesson-resume.v2:";
export const GUEST_LAST_OPENED_KEY = `${PREFIX}last-opened`;
const part = encodeURIComponent;
const lessonKey = (lessonId: string, accountId: string | null) => accountId === null
  ? PREFIX + part(lessonId)
  : accountPrefix(accountId) + "lesson-resume.v2:" + part(lessonId);
const sceneKey = (lessonId: string, sceneId: string, accountId: string | null) =>
  `${lessonKey(lessonId, accountId)}:scene:${part(sceneId)}`;

// One overlay per scene with a rejected reset, scoped to this document.
// Never publish an old reset after recovery: another tab may have edited the scene.
const temporaryScenes = new Map<string, Map<string, unknown>>();
let suspendedAccountPrefix: string | undefined;

export function suspendAccountLessonStorage(accountId: string) {
  suspendedAccountPrefix = accountPrefix(accountId);
}

export function canSaveAccountLessonStorage(accountId: string) {
  return suspendedAccountPrefix !== accountPrefix(accountId);
}

export function clearAccountLessonStorage(accountId: string) {
  suspendAccountLessonStorage(accountId);
  const prefix = accountPrefix(accountId);
  for (const key of temporaryScenes.keys()) {
    if (key.startsWith(prefix)) temporaryScenes.delete(key);
  }
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(prefix)) window.localStorage.removeItem(key);
    }
  } catch { /* Browser data can be cleared through its settings if storage access is blocked. */ }
}

function read(key: string): unknown {
  try { return JSON.parse(window.localStorage.getItem(key) ?? "null"); }
  catch { return null; }
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function legacy(lessonId: string, accountId: string | null, reader = read) {
  const saved = accountId === null ? record(reader(LEGACY_PREFIX + lessonId)) : {};
  return saved.version === 1 ? saved : {};
}

function write(key: string, value: unknown) {
  if (suspendedAccountPrefix && key.startsWith(suspendedAccountPrefix)) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify({ value }));
    return true;
  } catch { return false; }
}

function readValue(key: string, fallback: () => unknown, reader = read) {
  const entry = record(reader(key));
  return Object.hasOwn(entry, "value") ? entry.value : fallback();
}

export function readResumeRun(lessonId: string, exerciseIds: readonly string[], accountId: string | null): unknown {
  const oldRun = record(legacy(lessonId, accountId).run);
  const oldExercises = record(oldRun.version === 1 ? oldRun.exercises : null);
  const sceneId = accountId === null ? readValue(`${lessonKey(lessonId, null)}:current`, () => oldRun.version === 1 ? oldRun.sceneId : undefined) : undefined;
  const exercises = Object.fromEntries(exerciseIds.map(id => [
    id, readValue(`${sceneKey(lessonId, id, accountId)}:answer`, () => oldExercises[id]),
  ]));
  return { version: 1, sceneId, exercises };
}

export function writeResumeScene(lessonId: string, sceneId: string) {
  if (write(`${lessonKey(lessonId, null)}:current`, sceneId)) {
    write(GUEST_LAST_OPENED_KEY, { lessonId, sceneId });
  }
}

export function readGuestResumeScene(lessonId: string, reader: (key: string) => unknown) {
  return readValue(`${lessonKey(lessonId, null)}:current`, () => {
    const oldRun = record(legacy(lessonId, null, reader).run);
    return oldRun.version === 1 ? oldRun.sceneId : undefined;
  }, reader);
}

export function readGuestLastOpened(reader: (key: string) => unknown) {
  return readValue(GUEST_LAST_OPENED_KEY, () => undefined, reader);
}

export function writeResumeAnswer(lessonId: string, sceneId: string, answer: unknown, accountId: string | null) {
  write(`${sceneKey(lessonId, sceneId, accountId)}:answer`, answer);
}

function generation(base: string) {
  const value = record(read(`${base}:reset`)).value;
  return typeof value === "string" ? value : "";
}

function readSceneValue(lessonId: string, sceneId: string, slot: string, accountId: string | null, fallback: () => unknown) {
  const base = sceneKey(lessonId, sceneId, accountId);
  const temporary = temporaryScenes.get(base);
  if (temporary) return temporary.get(slot);
  const revision = generation(base);
  return readValue(`${base}:${revision}:${slot}`, revision ? () => undefined : fallback);
}

function writeSceneValue(lessonId: string, sceneId: string, slot: string, value: unknown, accountId: string | null) {
  const base = sceneKey(lessonId, sceneId, accountId);
  const temporary = temporaryScenes.get(base);
  if (temporary) {
    temporary.set(slot, value);
    return;
  }
  write(`${base}:${generation(base)}:${slot}`, value);
}

export function readSceneField(lessonId: string, sceneId: string, field: string, accountId: string | null): unknown {
  return readSceneValue(lessonId, sceneId, `field:${part(field)}`, accountId, () => record(record(legacy(lessonId, accountId).scenes)[sceneId])[field]);
}

export function writeSceneField(lessonId: string, sceneId: string, field: string, value: unknown, accountId: string | null) {
  writeSceneValue(lessonId, sceneId, `field:${part(field)}`, value, accountId);
}

export function resetSceneResume(lessonId: string, sceneId: string, accountId: string | null) {
  const base = sceneKey(lessonId, sceneId, accountId);
  const previous = generation(base);
  const revision = window.crypto.randomUUID();
  if (!write(`${base}:reset`, revision)) {
    temporaryScenes.set(base, new Map());
    return;
  }
  temporaryScenes.delete(base);
  if (generation(base) !== revision) return;
  // Retire the previous generation only. A concurrent reset or write can use a newer key.
  const prefix = `${base}:${previous}:`;
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(prefix)) window.localStorage.removeItem(key);
    }
  } catch { /* Obsolete keys are ignored even if cleanup fails. */ }
}

export function readResumeScroll(lessonId: string, sceneId: string, accountId: string | null): number | undefined {
  const offset = readSceneValue(lessonId, sceneId, "scroll", accountId, () => record(legacy(lessonId, accountId).scrollOffsets)[sceneId]);
  return typeof offset === "number" && Number.isFinite(offset) ? offset : undefined;
}

export function writeResumeScroll(lessonId: string, sceneId: string, offset: number, accountId: string | null) {
  if (Number.isFinite(offset)) writeSceneValue(lessonId, sceneId, "scroll", offset, accountId);
}
export const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
export const isText = (value: unknown): value is string => typeof value === "string";
export const boundedIndex = (length: number) => (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length;
export const oneOf = <T extends string | null>(values: readonly T[]) => (value: unknown): value is T =>
  values.some(item => item === value);
export const listOf = <T extends string>(values: readonly T[]) => (value: unknown): value is readonly T[] =>
  Array.isArray(value) && new Set(value).size === value.length && value.every(oneOf(values));
