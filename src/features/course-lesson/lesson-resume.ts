// Resume data is local to the browser and separate from confirmed progress.
const LEGACY_PREFIX = "sophia.lesson-resume.v1:";
const PREFIX = "sophia.lesson-resume.v2:";
const part = encodeURIComponent;
const lessonKey = (lessonId: string) => PREFIX + part(lessonId);
const sceneKey = (lessonId: string, sceneId: string) => `${lessonKey(lessonId)}:scene:${part(sceneId)}`;

function read(key: string): unknown {
  try { return JSON.parse(window.localStorage.getItem(key) ?? "null"); }
  catch { return null; }
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function legacy(lessonId: string) {
  const saved = record(read(LEGACY_PREFIX + lessonId));
  return saved.version === 1 ? saved : {};
}

function write(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify({ value })); }
  catch { /* Storage failure leaves the in-memory run usable. */ }
}

function readValue(key: string, fallback: () => unknown) {
  const entry = record(read(key));
  return Object.hasOwn(entry, "value") ? entry.value : fallback();
}

export function readResumeRun(lessonId: string, exerciseIds: readonly string[]): unknown {
  const oldRun = record(legacy(lessonId).run);
  const oldExercises = record(oldRun.version === 1 ? oldRun.exercises : null);
  const sceneId = readValue(`${lessonKey(lessonId)}:current`, () => oldRun.version === 1 ? oldRun.sceneId : undefined);
  const exercises = Object.fromEntries(exerciseIds.map(id => [
    id, readValue(`${sceneKey(lessonId, id)}:answer`, () => oldExercises[id]),
  ]));
  return { version: 1, sceneId, exercises };
}

export function writeResumeScene(lessonId: string, sceneId: string) {
  write(`${lessonKey(lessonId)}:current`, sceneId);
}

export function writeResumeAnswer(lessonId: string, sceneId: string, answer: unknown) {
  write(`${sceneKey(lessonId, sceneId)}:answer`, answer);
}

function generation(base: string) {
  const value = record(read(`${base}:reset`)).value;
  return typeof value === "string" ? value : "";
}

function readSceneValue(lessonId: string, sceneId: string, slot: string, fallback: () => unknown) {
  const base = sceneKey(lessonId, sceneId);
  const revision = generation(base);
  return readValue(`${base}:${revision}:${slot}`, revision ? () => undefined : fallback);
}

function writeSceneValue(lessonId: string, sceneId: string, slot: string, value: unknown) {
  const base = sceneKey(lessonId, sceneId);
  write(`${base}:${generation(base)}:${slot}`, value);
}

export function readSceneField(lessonId: string, sceneId: string, field: string): unknown {
  return readSceneValue(lessonId, sceneId, `field:${part(field)}`, () => record(record(legacy(lessonId).scenes)[sceneId])[field]);
}

export function writeSceneField(lessonId: string, sceneId: string, field: string, value: unknown) {
  writeSceneValue(lessonId, sceneId, `field:${part(field)}`, value);
}

export function resetSceneResume(lessonId: string, sceneId: string) {
  const base = sceneKey(lessonId, sceneId);
  const previous = generation(base);
  const revision = window.crypto.randomUUID();
  write(`${base}:reset`, revision);
  if (generation(base) !== revision) return;
  // Retire the previous generation only. A concurrent reset or write can use a newer key.
  const prefix = `${base}:${previous}:`;
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(prefix)) window.localStorage.removeItem(key);
    }
  } catch { /* Obsolete keys are ignored even if cleanup fails. */ }
}

export function readResumeScroll(lessonId: string, sceneId: string): number | undefined {
  const offset = readSceneValue(lessonId, sceneId, "scroll", () => record(legacy(lessonId).scrollOffsets)[sceneId]);
  return typeof offset === "number" && Number.isFinite(offset) ? offset : undefined;
}

export function writeResumeScroll(lessonId: string, sceneId: string, offset: number) {
  if (Number.isFinite(offset)) writeSceneValue(lessonId, sceneId, "scroll", offset);
}
export const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
export const isText = (value: unknown): value is string => typeof value === "string";
export const boundedIndex = (length: number) => (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length;
export const oneOf = <T extends string | null>(values: readonly T[]) => (value: unknown): value is T =>
  values.some(item => item === value);
export const listOf = <T extends string>(values: readonly T[]) => (value: unknown): value is readonly T[] =>
  Array.isArray(value) && new Set(value).size === value.length && value.every(oneOf(values));
