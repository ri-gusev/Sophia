// Resume data is browser-local and deliberately separate from lesson completion.
const PREFIX = "sophia.lesson-resume.v1:";
type Snapshot = { version: 1; run?: unknown; scenes: Record<string, Record<string, unknown>>; scrollOffsets: Record<string, number> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function empty(): Snapshot { return { version: 1, scenes: {}, scrollOffsets: {} }; }

function read(lessonId: string): Snapshot {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(PREFIX + lessonId) ?? "null");
    if (!isRecord(raw) || raw.version !== 1) return empty();
    const scenes: Snapshot["scenes"] = {};
    const scrollOffsets: Snapshot["scrollOffsets"] = {};
    if (isRecord(raw.scenes)) for (const [id, fields] of Object.entries(raw.scenes)) {
      if (isRecord(fields)) scenes[id] = fields;
    }
    if (isRecord(raw.scrollOffsets)) for (const [id, value] of Object.entries(raw.scrollOffsets)) {
      if (typeof value === "number" && Number.isFinite(value)) scrollOffsets[id] = value;
    }
    return { version: 1, run: raw.run, scenes, scrollOffsets };
  } catch { return empty(); }
}

function update(lessonId: string, change: (snapshot: Snapshot) => void) {
  try {
    const snapshot = read(lessonId);
    change(snapshot);
    window.localStorage.setItem(PREFIX + lessonId, JSON.stringify(snapshot));
  } catch { /* Storage may be unavailable; the current in-memory lesson remains usable. */ }
}

export function readResumeRun(lessonId: string): unknown { return read(lessonId).run; }
export function writeResumeRun(lessonId: string, run: unknown) { update(lessonId, snapshot => { snapshot.run = run; }); }
export function readSceneField(lessonId: string, sceneId: string, field: string): unknown { return read(lessonId).scenes[sceneId]?.[field]; }
export function writeSceneField(lessonId: string, sceneId: string, field: string, value: unknown) {
  update(lessonId, snapshot => { snapshot.scenes[sceneId] = { ...snapshot.scenes[sceneId], [field]: value }; });
}
export function resetSceneResume(lessonId: string, sceneId: string) {
  update(lessonId, snapshot => {
    delete snapshot.scenes[sceneId];
    delete snapshot.scrollOffsets[sceneId];
  });
}
export function readResumeScroll(lessonId: string, sceneId: string): number | undefined { return read(lessonId).scrollOffsets[sceneId]; }
export function writeResumeScroll(lessonId: string, sceneId: string, offset: number) {
  if (Number.isFinite(offset)) update(lessonId, snapshot => { snapshot.scrollOffsets[sceneId] = offset; });
}

export const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
export const isText = (value: unknown): value is string => typeof value === "string";
export const boundedIndex = (length: number) => (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length;
export const oneOf = <T extends string | null>(values: readonly T[]) => (value: unknown): value is T =>
  values.some(item => item === value);
export const listOf = <T extends string>(values: readonly T[]) => (value: unknown): value is readonly T[] =>
  Array.isArray(value) && new Set(value).size === value.length && value.every(oneOf(values));
