import { expect, test, type APIRequestContext } from "@playwright/test";
import type { ProgressResponse } from "../src/features/account/progress/contract";
import { INTRO_LESSONS } from "../src/features/course-lesson/lesson-data";
import { accountTestSettings } from "./support/account-test-settings";
import { createTestAccount, loginTestAccount } from "./support/accounts";

const intro = "plato-introduction";
const socratic = "plato-socratic-question";
const virtue = "plato-virtue-definition";
const lessonPath = (sceneId: string) => `/learn#lesson=${intro}&scene=${sceneId}`;

async function progress(request: APIRequestContext): Promise<ProgressResponse> {
  const response = await request.get("/api/progress");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");
  return response.json();
}

function writeProgress(request: APIRequestContext, data: object, origin = accountTestSettings().origin) {
  return request.post("/api/progress", { data, headers: { origin } });
}

test("guest transfer merges with account progress and later lesson changes stay with the signed-in user", async ({ page, browser }) => {
  test.slow();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(lessonPath("journey"));
  const lesson = page.getByTestId("lesson-introduction");
  await lesson.getByRole("button", { name: "Начать путешествие" }).click();
  await expect(lesson.getByTestId("lesson-scene")).toHaveAttribute("data-scene-id", "athens");
  await expect(lesson.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  expect((await page.request.get("/api/progress")).status()).toBe(401);

  const guest = await page.evaluate(({ socratic, virtue, sceneIds }) => {
    localStorage.setItem("sophia.lesson-completions.v1", JSON.stringify([virtue, "unknown-lesson"]));
    for (const sceneId of sceneIds) localStorage.setItem(`sophia.lesson-progress.v2:slide:${socratic}:${sceneId}`, "1");
    localStorage.setItem(`sophia.lesson-progress.v2:finished:${socratic}`, "1");
    localStorage.setItem("unrelated-private-data", "Never upload this value");
    return Object.fromEntries(Object.entries(localStorage).filter(([key]) =>
      key.startsWith("sophia.lesson-progress.") || key === "sophia.lesson-completions.v1"
      || key.endsWith(":current") || key.endsWith(":last-opened") || key === "unrelated-private-data"));
  }, { socratic, virtue, sceneIds: INTRO_LESSONS[socratic].scenes.map(scene => scene.id) });
  const first = await createTestAccount(page.request, "Первый ученик");
  await loginTestAccount(page.request, first);
  const { accountId } = await progress(page.request);
  for (const action of ["confirm", "resume"] as const) {
    expect((await writeProgress(page.request, { expectedAccountId: accountId, action, lessonId: intro, sceneId: "socrates" })).ok()).toBe(true);
  }

  let rejectImport = true;
  await page.route("**/api/progress", async route => {
    if (route.request().method() === "POST" && route.request().postDataJSON().action === "import") {
      expect(route.request().postData()).not.toContain("unknown-lesson");
      expect(route.request().postData()).not.toContain("Never upload this value");
      if (rejectImport) {
        rejectImport = false;
        await route.fulfill({ status: 503 });
        return;
      }
    }
    await route.continue();
  });
  await page.goto("/profile");
  const transfer = page.getByRole("button", { name: "Перенести прогресс" });
  await transfer.click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Не удалось перенести прогресс");
  expect((await progress(page.request)).progress.lessons.find(entry => entry.lessonId === socratic)?.completed).toBe(false);
  await transfer.click();
  await expect(page.getByRole("status").filter({ hasText: "Прогресс перенесён" })).toHaveText("Прогресс перенесён в аккаунт.");
  const afterImport = (await progress(page.request)).progress;
  expect(afterImport.lessons.find(entry => entry.lessonId === intro)?.confirmedSceneIds).toEqual(["journey", "socrates"]);
  expect(afterImport.lessons.find(entry => entry.lessonId === socratic)?.completed).toBe(true);
  expect(afterImport.lessons.find(entry => entry.lessonId === virtue)?.legacyCompleted).toBe(true);
  expect(afterImport.lastOpened).toEqual({ lessonId: intro, sceneId: "socrates" });
  expect(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(guest))).toEqual(guest);
  await page.reload();
  await expect(page.getByRole("button", { name: "Перенести прогресс" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Продолжить обучение" })).toHaveAttribute("href", lessonPath("socrates"));

  await page.goto(lessonPath("athens"));
  await lesson.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(lesson.getByTestId("lesson-scene")).toHaveAttribute("data-scene-id", "poet");
  await expect(lesson.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
  await lesson.getByRole("radio").nth(1).check();
  await expect.poll(async () => (await progress(page.request)).progress.lastOpened).toEqual({ lessonId: intro, sceneId: "poet" });
  expect(await page.evaluate(() => localStorage.getItem("sophia.lesson-progress.v2:slide:plato-introduction:athens"))).toBeNull();

  const otherDevice = await browser.newPage({ baseURL: accountTestSettings().origin });
  try {
    await loginTestAccount(otherDevice.request, first);
    await otherDevice.goto("/profile");
    await otherDevice.getByRole("link", { name: "Продолжить обучение" }).click();
    const deviceLesson = otherDevice.getByTestId("lesson-introduction");
    await expect(deviceLesson.getByTestId("lesson-scene")).toHaveAttribute("data-scene-id", "poet");
    await expect(deviceLesson.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
    await expect(deviceLesson.getByRole("radio").nth(1)).not.toBeChecked();

    const scenes = INTRO_LESSONS[intro].scenes.map(scene => scene.id);
    const confirmations = await Promise.all(scenes.slice(0, -1).map((sceneId, index) =>
      writeProgress(index % 2 ? page.request : otherDevice.request, { expectedAccountId: accountId, action: "confirm", lessonId: intro, sceneId })));
    expect(confirmations.every(response => response.ok())).toBe(true);
    await otherDevice.goto(lessonPath(scenes.at(-1)!));
    await deviceLesson.getByRole("button", { name: "Завершить урок", exact: true }).click();
    await expect(deviceLesson).toHaveCount(0);
    expect((await progress(otherDevice.request)).progress.lessons.find(entry => entry.lessonId === intro)?.completed).toBe(true);

    const sameDeviceTab = await page.context().newPage();
    try {
      await sameDeviceTab.goto(lessonPath("socrates"));
      await expect(sameDeviceTab.getByTestId("lesson-scene")).toHaveAttribute("data-scene-id", "socrates");
      await page.goto("/profile");
      await page.getByRole("main").getByRole("button", { name: "Выйти из аккаунта" }).click();
      await expect(page).toHaveURL(/\/$/);
      await expect(sameDeviceTab).toHaveURL(/\/learn$/);
      await expect(sameDeviceTab.getByTestId("lesson-introduction")).toHaveCount(0);
      expect(await sameDeviceTab.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(guest))).toEqual(guest);
    } finally {
      await sameDeviceTab.close();
    }
    const second = await createTestAccount(page.request, "Второй ученик");
    await loginTestAccount(page.request, second);
    const secondProgress = await progress(page.request);
    expect(secondProgress.accountId).not.toBe(accountId);
    expect(secondProgress.progress.lessons.every(entry => !entry.completed && !entry.legacyCompleted && !entry.confirmedSceneIds.length)).toBe(true);
    const stale = { expectedAccountId: accountId, action: "resume", lessonId: intro, sceneId: "journey" };
    expect((await writeProgress(page.request, stale)).status()).toBe(409);
    expect((await writeProgress(page.request, { ...stale, expectedAccountId: secondProgress.accountId }, "https://other.example")).status()).toBe(403);
    expect((await writeProgress(page.request, { ...stale, expectedAccountId: secondProgress.accountId, sceneId: "a".repeat(9000) })).status()).toBe(413);
    const foreignRead = await page.request.get("/api/progress", { headers: { "X-Sophia-Account": accountId } });
    expect(foreignRead.status()).toBe(409);
    expect((await progress(page.request)).progress.lastOpened).toBeNull();
    await page.goto(lessonPath("poet"));
    await expect(lesson.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    await expect(lesson.getByRole("radio").nth(1)).not.toBeChecked();
    expect((await progress(otherDevice.request)).progress.lessons.find(entry => entry.lessonId === intro)?.completed).toBe(true);
  } finally {
    await otherDevice.close();
  }
});
