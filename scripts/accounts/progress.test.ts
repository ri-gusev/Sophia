import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test, { type TestContext } from "node:test";
import { INTRO_LESSONS } from "../../src/features/course-lesson/lesson-data.ts";
import { parseProgressMutation } from "../../src/features/account/progress/contract.ts";
import { collectGuestProgress } from "../../src/features/account/progress/client/guest-progress.ts";
import { ACCOUNT_PROGRESS_SCHEMA } from "../../src/features/account/progress/server/schema.ts";
import { applyProgressMutation, readProgress } from "../../src/features/account/progress/server/store.ts";

const accountId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const lessonId = "plato-virtue-definition";
const scenes = INTRO_LESSONS[lessonId].scenes.map(scene => scene.id);
const [first, second] = scenes;
const final = scenes.at(-1)!;
const position = { lessonId, sceneId: second } as const;

function fixture(t: TestContext) {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec("CREATE TABLE account_users(id TEXT PRIMARY KEY);");
  db.prepare("INSERT INTO account_users VALUES (?), (?)").run(accountId, otherId);
  db.exec(ACCOUNT_PROGRESS_SCHEMA);
  const read = (id = accountId) => readProgress(db, id);
  return { db, read };
}

test("confirmations are idempotent and completion requires all previous slides", t => {
  const { db, read } = fixture(t);
  const mutate = (action: "confirm" | "finish" | "resume", sceneId: string) =>
    applyProgressMutation(db, accountId, { action, lessonId, sceneId });
  assert.equal(mutate("finish", final).missingSceneId, first);
  assert.equal(read().lessons.find(lesson => lesson.lessonId === lessonId)?.completed, false);
  assert.throws(() => mutate("confirm", final));
  for (const sceneId of scenes.slice(0, -1)) {
    mutate("confirm", sceneId);
    mutate("confirm", sceneId);
  }
  mutate("finish", final);
  const completed = read().lessons.find(lesson => lesson.lessonId === lessonId);
  assert.deepEqual(completed?.confirmedSceneIds, scenes);
  assert.equal(completed?.completed, true);
  assert.equal(read(otherId).lessons.some(lesson => lesson.completed || lesson.confirmedSceneIds.length), false);
});

test("repeated import unions confirmations, preserves server resume and keeps legacy completion distinct", t => {
  const { db, read } = fixture(t);
  applyProgressMutation(db, accountId, { action: "confirm", lessonId, sceneId: first });
  applyProgressMutation(db, accountId, { action: "resume", lessonId, sceneId: first });
  const mutation = {
    action: "import", lastOpened: position,
    lessons: [{ lessonId, confirmedSceneIds: [second], completed: false, legacyCompleted: true, resumeSceneId: second }],
  } as const;
  applyProgressMutation(db, accountId, mutation);
  applyProgressMutation(db, accountId, mutation);
  assert.deepEqual(read().lessons.find(lesson => lesson.lessonId === lessonId), {
    lessonId, confirmedSceneIds: [first, second], completed: false, legacyCompleted: true, resumeSceneId: first,
  });
  assert.deepEqual(read().lastOpened, { lessonId, sceneId: first });
  assert.equal(read(otherId).lastOpened, null);
  applyProgressMutation(db, otherId, mutation);
  assert.deepEqual(read(otherId).lastOpened, position);
});

test("a failed completion rolls back its final confirmation", t => {
  const { db, read } = fixture(t);
  for (const sceneId of scenes.slice(0, -1)) {
    applyProgressMutation(db, accountId, { action: "confirm", lessonId, sceneId });
  }
  db.exec(`CREATE TRIGGER stop_completion BEFORE UPDATE OF completed ON account_lesson_progress
    WHEN new.completed = 1 BEGIN SELECT RAISE(ABORT, 'write failed'); END;`);
  assert.throws(() => applyProgressMutation(db, accountId, { action: "finish", lessonId, sceneId: final }), /write failed/);
  assert.deepEqual(read().lessons.find(lesson => lesson.lessonId === lessonId)?.confirmedSceneIds, scenes.slice(0, -1));
});

test("progress payloads reject unknown, oversized, duplicate, and inconsistent claims", () => {
  const payload = { expectedAccountId: accountId, action: "resume", ...position };
  assert.deepEqual(parseProgressMutation(payload), { action: "resume", ...position });
  assert.equal(parseProgressMutation({ ...payload, lessonId: "__proto__" }), null);
  assert.equal(parseProgressMutation({ ...payload, sceneId: "unknown" }), null);
  assert.equal(parseProgressMutation({ ...payload, userId: otherId }), null);
  const entry = { lessonId, confirmedSceneIds: [first], completed: false, legacyCompleted: true, resumeSceneId: null };
  const request = (lessons: unknown[]) => parseProgressMutation({ expectedAccountId: accountId, action: "import", lessons, lastOpened: null });
  assert.ok(request([entry]));
  assert.equal(request(Array(100).fill(entry)), null);
  assert.equal(request([entry, entry]), null);
  assert.equal(request([{ ...entry, confirmedSceneIds: [first, first] }]), null);
  assert.equal(request([{ ...entry, completed: true }]), null);
});

test("guest collection reads bounded known records and ignores private scene fields and corrupt data", () => {
  const entries = new Map([
    ["sophia.lesson-completions.v1", JSON.stringify([lessonId, "unknown"])],
    [`sophia.lesson-progress.v2:slide:${lessonId}:${first}`, "1"],
    [`sophia.lesson-progress.v2:finished:${lessonId}`, "1"],
    [`sophia.lesson-resume.v2:${lessonId}:current`, JSON.stringify({ value: second })],
    ["sophia.lesson-resume.v2:last-opened", JSON.stringify({ value: position })],
    ["sophia.lesson-resume.v1:plato-introduction", " ".repeat(256_000)],
  ]);
  const guest = collectGuestProgress(key => {
    assert.ok(!key.includes(":field:") && !key.includes(":answer") && !key.includes("sophia.account."));
    return entries.get(key) ?? null;
  });
  assert.deepEqual(guest, {
    lessons: [{ lessonId, confirmedSceneIds: [first], completed: false, legacyCompleted: true, resumeSceneId: second }],
    lastOpened: position,
  });
  assert.equal(collectGuestProgress(() => { throw new Error("storage blocked"); }), null);
});
