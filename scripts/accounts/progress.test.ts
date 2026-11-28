import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { type TestContext } from "node:test";
import { INTRO_LESSONS } from "../../src/features/course-lesson/lesson-data.ts";
import { parseProgressMutation } from "../../src/features/account/progress/contract.ts";
import { collectGuestProgress } from "../../src/features/account/progress/client/guest-progress.ts";
import { ACCOUNT_PROGRESS_HISTORY_SCHEMA, ACCOUNT_PROGRESS_SCHEMA } from "../../src/features/account/progress/server/schema.ts";
import { applyProgressMutation, readLearningProgress, readProgress } from "../../src/features/account/progress/server/store.ts";
import { limitProgressRequests } from "../../src/features/account/progress/server/rate-limits.ts";
import { openAccountDatabase } from "../../src/features/account/server/database.ts";
import { ACCOUNT_PROFILE_MAILING_CONSENT_SCHEMA } from "../../src/features/legal/server/schema.ts";
import { buildProfileLearning } from "../../src/features/account/profile-learning-data.ts";
import { getMoscowDay } from "../../src/features/philosophy-question/daily-calendar.ts";

const accountId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const lessonId = "plato-virtue-definition";
const scenes = INTRO_LESSONS[lessonId].scenes.map(scene => scene.id);
const [first, second] = scenes;
const final = scenes.at(-1)!;
const position = { lessonId, sceneId: second } as const;

test("progress quotas separate reads and writes, bound account, network and server, and expire", () => {
  for (let index = 0; index < 30; index++) limitProgressRequests("write", "one", accountId, 1);
  assert.throws(() => limitProgressRequests("write", "two", accountId, 1), { status: 429, retryAfter: 60 });
  assert.doesNotThrow(() => limitProgressRequests("read", "one", accountId, 1));
  for (let index = 0; index < 15; index++) limitProgressRequests("write", "one", otherId, 1);
  assert.throws(() => limitProgressRequests("write", "one", "third", 1), { status: 429 });
  for (let index = 0; index < 75; index++) limitProgressRequests("write", `network-${index}`, `user-${index}`, 1);
  assert.throws(() => limitProgressRequests("write", "new-network", "new-user", 1), { status: 429 });
  assert.doesNotThrow(() => limitProgressRequests("write", "one", accountId, 60_001));
});

function fixture(t: TestContext) {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec("CREATE TABLE account_users(id TEXT PRIMARY KEY);");
  db.prepare("INSERT INTO account_users VALUES (?), (?)").run(accountId, otherId);
  db.exec(ACCOUNT_PROGRESS_SCHEMA);
  db.exec(ACCOUNT_PROGRESS_HISTORY_SCHEMA);
  const read = (id = accountId) => readProgress(db, id);
  return { db, read };
}

test("profile activity uses the first valid finish and Moscow midnight, and is isolated and cascades", t => {
  const { db } = fixture(t);
  const beforeMidnight = Date.parse("2028-02-28T20:59:59.999Z");
  const afterMidnight = beforeMidnight + 1;
  const dashboard = (id = accountId) => buildProfileLearning(readLearningProgress(db, id), getMoscowDay(afterMidnight));
  const finish = (id: typeof lessonId | "plato-socratic-question", now: number) => {
    const lessonScenes = INTRO_LESSONS[id].scenes.map(scene => scene.id);
    for (const sceneId of lessonScenes.slice(0, -1)) applyProgressMutation(db, accountId, { action: "confirm", lessonId: id, sceneId });
    applyProgressMutation(db, accountId, { action: "finish", lessonId: id, sceneId: lessonScenes.at(-1)! }, now);
  };

  assert.deepEqual(dashboard().activity, {});
  applyProgressMutation(db, accountId, { action: "resume", lessonId, sceneId: first });
  applyProgressMutation(db, accountId, { action: "finish", lessonId, sceneId: final }, beforeMidnight);
  assert.deepEqual(dashboard().activity, {});
  finish(lessonId, beforeMidnight);
  finish(lessonId, afterMidnight);
  finish("plato-socratic-question", afterMidnight);
  assert.deepEqual(dashboard().activity, { "2028-02-28": 1, "2028-02-29": 1 });
  assert.equal(dashboard().completed, 2);
  assert.deepEqual(dashboard(otherId).activity, {});
  assert.equal(dashboard(otherId).philosophers, 0);
  assert.deepEqual(dashboard(otherId).directions, []);
  db.prepare("DELETE FROM account_users WHERE id = ?").run(accountId);
  assert.deepEqual(dashboard().activity, {});
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM account_lesson_progress").get()?.total, 0);
});

test("the profile continues the most recently opened unfinished lesson, including after an already finished lesson was opened", t => {
  const { db } = fixture(t);
  const intro = "plato-introduction";
  const socratic = "plato-socratic-question";
  const dashboard = () => buildProfileLearning(readLearningProgress(db, accountId), getMoscowDay());
  applyProgressMutation(db, accountId, { action: "resume", lessonId: intro, sceneId: "athens" });
  applyProgressMutation(db, accountId, { action: "resume", lessonId, sceneId: second });
  applyProgressMutation(db, accountId, { action: "import", lastOpened: null, lessons: [{
    lessonId: socratic, confirmedSceneIds: INTRO_LESSONS[socratic].scenes.map(scene => scene.id),
    completed: true, legacyCompleted: false, resumeSceneId: null,
  }] });
  applyProgressMutation(db, accountId, { action: "resume", lessonId: socratic, sceneId: "first-step" });
  applyProgressMutation(db, accountId, { action: "finish", lessonId: socratic, sceneId: "first-step" });

  assert.equal(dashboard().completed, 1);
  assert.deepEqual(dashboard().activity, {});
  assert.equal(dashboard().philosophers, 1);
  assert.deepEqual(dashboard().directions.map(item => [item.name, item.total, item.continueAt]), [
    ["Сократ и рождение философского вопроса", 2, { lessonId: intro, sceneId: "athens" }],
    ["Добродетель и правильная жизнь", 1, position],
  ]);
  applyProgressMutation(db, accountId, { action: "confirm", lessonId, sceneId: first });
  assert.equal(dashboard().directions[0].name, "Добродетель и правильная жизнь");
  applyProgressMutation(db, accountId, { action: "confirm", lessonId: intro, sceneId: "journey" });
  assert.equal(dashboard().directions[0].name, "Сократ и рождение философского вопроса");
});

test("schema 5 progress migrates with unknown completion dates and the saved resume position", t => {
  const dir = mkdtempSync(join(tmpdir(), "sophia-profile-migration-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "account.sqlite");
  using before = openAccountDatabase(path, true);
  before.prepare("INSERT INTO account_users VALUES (?, ?, ?, ?, ?, ?, ?)").run(accountId, "legacy@mail.ru", "Имя", "hash", 1, 1, 1);
  before.prepare("INSERT INTO account_lesson_progress (user_id, lesson_id, completed, resume_scene_id) VALUES (?, ?, 1, ?)").run(accountId, lessonId, final);
  const addSlide = before.prepare("INSERT INTO account_slide_progress (user_id, lesson_id, scene_id) VALUES (?, ?, ?)");
  for (const sceneId of scenes) addSlide.run(accountId, lessonId, sceneId);
  before.prepare("INSERT INTO account_last_opened_lesson VALUES (?, ?)").run(accountId, lessonId);
  before.exec(`ALTER TABLE account_lesson_progress DROP COLUMN completed_at;
    DROP TABLE account_deletion_binding;
    ALTER TABLE account_lesson_progress DROP COLUMN activity_order;
    DROP TABLE account_profile_mailing_consents;
    DROP TRIGGER account_mailing_revisions_no_delete;
    DROP TABLE account_mailing_revisions;
    ${ACCOUNT_PROFILE_MAILING_CONSENT_SCHEMA}
    PRAGMA user_version = 5;`);

  using migrated = openAccountDatabase(path);
  assert.equal(migrated.prepare("PRAGMA user_version").get()?.user_version, 8);
  assert.deepEqual(readProgress(migrated, accountId).lastOpened, { lessonId, sceneId: final });
  assert.equal(buildProfileLearning(readLearningProgress(migrated, accountId), getMoscowDay()).completed, 1);
  applyProgressMutation(migrated, accountId, { action: "finish", lessonId, sceneId: final });
  assert.deepEqual(buildProfileLearning(readLearningProgress(migrated, accountId), getMoscowDay()).activity, {});
});

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
