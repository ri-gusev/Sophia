import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { ProgressMutation } from "../src/features/account/progress/contract";
import { openAccountDatabase } from "../src/features/account/server/database";
import { INTRO_LESSONS, type IntroLessonId } from "../src/features/course-lesson/lesson-data";
import { finishKey, slideKey } from "../src/features/course-lesson/lesson-slide-progress";
import { getMoscowDay, isoDate } from "../src/features/philosophy-question/daily-calendar";
import { accountTestSettings } from "./support/account-test-settings";
import { loginTestAccount, postAccount, seedVerifiedTestAccount } from "./support/accounts";

const intro = "plato-introduction";
const socratic = "plato-socratic-question";
const virtue = "plato-virtue-definition";
type StatKey = "streak" | "record" | "completed" | "philosophers";

const lessonPath = (lessonId: IntroLessonId, sceneId: string) => `/learn#lesson=${lessonId}&scene=${sceneId}`;
const heatmap = (page: Page) => page.getByRole("region", { name: "Активность обучения" });
const dayCell = (page: Page, date: string) => heatmap(page).locator(`[data-date="${date}"]`);
const stat = (page: Page, key: StatKey) => page.locator(`[data-stat="${key}"]`);
const learning = (page: Page) => page.getByRole("region", { name: "Твоё обучение" });
const continueLearning = (page: Page) => learning(page).getByRole("link", { name: "Продолжить обучение" });
const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.use({ timezoneId: "America/Los_Angeles" });

async function readAccountId(page: Page): Promise<string> {
  const response = await page.request.get("/api/progress");
  expect(response.ok()).toBe(true);
  return (await response.json()).accountId;
}

async function writeProgress(page: Page, accountId: string, mutation: ProgressMutation) {
  const response = await page.request.post("/api/progress", {
    data: { expectedAccountId: accountId, ...mutation },
    headers: { origin: accountTestSettings().origin },
  });
  expect(response.ok()).toBe(true);
}

async function prepareFinish(page: Page, accountId: string, lessonId: IntroLessonId) {
  const sceneIds = INTRO_LESSONS[lessonId].scenes.map(scene => scene.id);
  for (const sceneId of sceneIds.slice(0, -1)) {
    await writeProgress(page, accountId, { action: "confirm", lessonId, sceneId });
  }
  return sceneIds.at(-1)!;
}

async function logout(page: Page, accountId: string) {
  expect((await postAccount(page.request, "logout", { accountId })).ok()).toBe(true);
}

async function expectStat(page: Page, key: StatKey, value: number) {
  await expect(stat(page, key).locator("dd")).toHaveText(String(value));
}

async function answerQuestionOfTheDay(page: Page, time?: string) {
  if (time) await page.clock.setFixedTime(new Date(time));
  await page.goto("/");
  const quiz = page.getByRole("group", { name: "Вопрос дня" });
  await quiz.getByRole("radio").first().check();
  await quiz.getByRole("button", { name: "Проверить ответ" }).click();
  await expect(quiz.getByRole("status")).toContainText("Серия продлена");
}

async function expectTooltipInViewport(page: Page) {
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect.poll(async () => tooltip.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
  })).toBe(true);
  return tooltip;
}

test("a new profile fits all target widths with real identity, zero statistics and keyboard navigation", async ({ page }) => {
  test.slow();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const account = await seedVerifiedTestAccount("Лидия Соколова");
  const db = openAccountDatabase(accountTestSettings().database);
  try {
    // Although the UTC date is October, the Moscow registration date is November.
    db.prepare("UPDATE account_users SET created_at = ? WHERE email = ?")
      .run(Date.parse("2026-10-31T21:05:00Z"), account.email);
  } finally {
    db.close();
  }
  await loginTestAccount(page.request, account);

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Лидия Соколова", level: 1 })).toBeVisible();
    await expect(page.getByRole("main").getByText("Л", { exact: true })).toBeVisible();
    await expect(page.getByText("На пути к мудрости")).toBeVisible();
    await expect(page.getByText("На платформе «София» с ноября 2026", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Настройки аккаунта" })).toHaveAttribute("href", "#account-settings");
    for (const key of ["streak", "record", "completed", "philosophers"] as const) await expectStat(page, key, 0);
    await expect(learning(page).getByRole("link", { name: "Перейти к карте курса" })).toHaveAttribute("href", "/learn");
    await expect(heatmap(page).locator("[data-date]")).toHaveCount(365);
    await expect(heatmap(page).locator('[data-date][data-level="0"]')).toHaveCount(365);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(wcag).analyze()).violations).toEqual([]);
  }

  await page.setViewportSize({ width: 320, height: 800 });
  await page.reload();
  const today = getMoscowDay();
  const latest = dayCell(page, isoDate(today));
  const oldest = dayCell(page, isoDate(today - 364));
  await expect(oldest).toBeAttached();
  await expect(dayCell(page, isoDate(today + 1))).toHaveCount(0);
  const scroll = heatmap(page).locator("[data-activity-scroll]");
  expect(await scroll.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  expect(await latest.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    const scroll = node.closest("[data-activity-scroll]")!.getBoundingClientRect();
    return bounds.left >= scroll.left - 1 && bounds.right <= scroll.right + 1;
  })).toBe(true);

  await expect(heatmap(page).locator('[data-date][tabindex="0"]')).toHaveCount(1);
  await expect(latest).toHaveAttribute("tabindex", "0");
  await learning(page).getByRole("link", { name: "Перейти к карте курса" }).focus();
  await page.keyboard.press("Tab");
  await expect(latest).toBeFocused();
  await expect(await expectTooltipInViewport(page)).toContainText("Нет завершённых уроков");
  await page.keyboard.press("ArrowLeft");
  await expect(dayCell(page, isoDate(today - 7))).toBeFocused();
  await page.keyboard.press("Home");
  await expect(oldest).toBeFocused();
  await expectTooltipInViewport(page);
  await page.keyboard.press("End");
  await expect(latest).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();

  await page.getByRole("link", { name: "Настройки аккаунта" }).click();
  await expect(page).toHaveURL(/\/profile#account-settings$/);
  await expect(page.getByRole("heading", { name: "Настройки аккаунта" })).toBeInViewport();
});

test("the streak cards use daily answers and preserve the record across Moscow midnight and a missed day", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const first = await seedVerifiedTestAccount();
  const second = await seedVerifiedTestAccount();
  await loginTestAccount(page.request, first);
  const accountId = await readAccountId(page);

  await answerQuestionOfTheDay(page, "2026-12-30T20:55:00Z");
  await answerQuestionOfTheDay(page, "2026-12-31T20:55:00Z");
  await page.goto("/profile");
  await expectStat(page, "streak", 2);
  await expectStat(page, "record", 2);
  await expect(stat(page, "streak")).toHaveAttribute("data-active", "true");
  await expectStat(page, "completed", 0);
  await expect(heatmap(page).locator('[data-date][data-level="0"]')).toHaveCount(365);

  await page.clock.setFixedTime(new Date("2026-12-31T21:00:00Z"));
  await page.reload();
  await expectStat(page, "streak", 2);
  await expect(stat(page, "streak")).toHaveAttribute("data-active", "false");

  await page.clock.setFixedTime(new Date("2027-01-01T21:00:00Z"));
  await page.reload();
  await expectStat(page, "streak", 0);
  await expectStat(page, "record", 2);

  await logout(page, accountId);
  await loginTestAccount(page.request, second);
  await page.goto("/profile");
  await expectStat(page, "streak", 0);
  await expectStat(page, "record", 0);
  await expect(stat(page, "streak")).toHaveAttribute("data-active", "false");
});

test("a completion colors the calendar once and started directions can expand and resume", async ({ page, isMobile }, info) => {
  test.slow();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(isMobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  const first = await seedVerifiedTestAccount("Александра Соколова");
  const second = await seedVerifiedTestAccount();
  await loginTestAccount(page.request, first);
  const accountId = await readAccountId(page);
  const today = isoDate(getMoscowDay());
  const unfinished = "virtue-swarm";
  const virtueTitle = "Добродетель и правильная жизнь";
  const socratesTitle = "Сократ и рождение философского вопроса";
  const virtueDirection = learning(page).getByRole("article", { name: virtueTitle });
  const socratesDirection = learning(page).getByRole("article", { name: socratesTitle });
  const directionsToggle = learning(page).getByRole("button", { name: /направления$/ });
  await writeProgress(page, accountId, { action: "resume", lessonId: virtue, sceneId: unfinished });
  await page.goto("/profile");
  await expect(virtueDirection).toBeVisible();
  await expect(virtueDirection.getByText("0 из 1 урока")).toBeVisible();
  await expect(socratesDirection).not.toBeVisible();
  await expect(directionsToggle).toHaveCount(0);
  await expect(continueLearning(page)).toHaveAttribute("href", lessonPath(virtue, unfinished));

  const socraticResume = "socratic-questions";
  await writeProgress(page, accountId, { action: "resume", lessonId: socratic, sceneId: socraticResume });
  const final = await prepareFinish(page, accountId, intro);
  await writeProgress(page, accountId, { action: "resume", lessonId: intro, sceneId: final });
  await page.goto("/profile");
  await expectStat(page, "philosophers", 1);
  await expectStat(page, "completed", 0);
  await expect(dayCell(page, today)).toHaveAttribute("data-level", "0");
  const emptyColor = await dayCell(page, today).evaluate(node => getComputedStyle(node).backgroundColor);

  await expect(continueLearning(page)).toHaveAttribute("href", lessonPath(intro, final));
  await continueLearning(page).click();
  const lesson = page.getByTestId("lesson-introduction");
  await lesson.getByRole("button", { name: "Завершить урок", exact: true }).click();
  await expect(lesson).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/profile$/);
  await expectStat(page, "completed", 1);
  await expect(dayCell(page, today)).toHaveAttribute("data-level", "1");
  await expect.poll(() => dayCell(page, today).evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe(emptyColor);
  await expect(socratesDirection.getByText("1 из 2 уроков")).toBeVisible();
  await expect(continueLearning(page)).toHaveAttribute("href", lessonPath(socratic, socraticResume));

  await writeProgress(page, accountId, { action: "finish", lessonId: intro, sceneId: final });
  await page.reload();
  await expectStat(page, "completed", 1);
  await expect(dayCell(page, today)).toHaveAttribute("data-level", "1");

  const socraticFinal = await prepareFinish(page, accountId, socratic);
  await writeProgress(page, accountId, { action: "finish", lessonId: socratic, sceneId: socraticFinal });
  await logout(page, accountId);
  await loginTestAccount(page.request, first);
  await answerQuestionOfTheDay(page);
  await page.goto("/profile");
  await expectStat(page, "streak", 1);
  await expectStat(page, "completed", 2);
  await expectStat(page, "philosophers", 1);
  await expect(socratesDirection.getByText("Платон", { exact: true })).toBeVisible();
  await expect(socratesDirection).toBeVisible();
  await expect(virtueDirection).not.toBeVisible();
  await expect(socratesDirection.getByText("2 из 2 уроков")).toBeVisible();
  await expect(socratesDirection.getByText("Завершено", { exact: true })).toBeVisible();
  await expect(socratesDirection.getByRole("link", { name: "Вернуться к материалам" })).toBeVisible();
  await expect(directionsToggle).toHaveAttribute("aria-expanded", "false");
  const calendarTop = () => heatmap(page).evaluate(node => node.getBoundingClientRect().top + window.scrollY);
  const collapsed = await calendarTop();
  await directionsToggle.focus();
  await page.keyboard.press("Enter");
  await expect(directionsToggle).toHaveAttribute("aria-expanded", "true");
  await expect(virtueDirection).toBeVisible();
  await expect.poll(calendarTop).toBeGreaterThan(collapsed);
  await directionsToggle.click();
  await expect(directionsToggle).toHaveAttribute("aria-expanded", "false");
  await expect(virtueDirection).not.toBeVisible();
  await expect.poll(async () => Math.abs(await calendarTop() - collapsed)).toBeLessThan(2);
  await directionsToggle.click();
  await expect(virtueDirection).toBeVisible();
  await expect(continueLearning(page)).toHaveAttribute("href", lessonPath(virtue, unfinished));
  await expect(dayCell(page, today)).toHaveAttribute("data-level", "2");
  expect((await new AxeBuilder({ page }).withTags(wcag).analyze()).violations).toEqual([]);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: info.outputPath("profile.png"), fullPage: true, animations: "disabled", scale: "css" });

  await heatmap(page).evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
  if (isMobile) await dayCell(page, today).tap();
  else await dayCell(page, today).hover();
  const tooltip = await expectTooltipInViewport(page);
  await expect(dayCell(page, today)).toHaveAttribute("data-active", "true");
  await expect(tooltip).toContainText("Пройдено уроков: 2");
  await expect(tooltip).toContainText(new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${today}T00:00:00Z`)).replace(/\sг\.$/, ""));
  await page.screenshot({ path: info.outputPath("profile-calendar-tooltip.png"), animations: "disabled", scale: "css" });

  await continueLearning(page).click();
  await expect(page).toHaveURL(lessonPath(virtue, unfinished));
  const resumedScene = page.getByTestId("virtue-swarm-scene");
  await expect(resumedScene).toBeVisible();
  await page.reload();
  await expect(resumedScene).toBeVisible();

  await logout(page, accountId);
  await loginTestAccount(page.request, second);
  await page.goto("/profile");
  await expectStat(page, "completed", 0);
  await expectStat(page, "philosophers", 0);
  await expect(dayCell(page, today)).toHaveAttribute("data-level", "0");
});

test("guest imports count as progress without dated activity and deleting the account clears its lesson rows", async ({ page }) => {
  await page.goto("/learn");
  await page.evaluate(({ slideKeys, finished }) => {
    for (const key of slideKeys) localStorage.setItem(key, "1");
    localStorage.setItem(finished, "1");
  }, {
    slideKeys: INTRO_LESSONS[socratic].scenes.map(scene => slideKey(socratic, scene.id)),
    finished: finishKey(socratic),
  });
  const account = await seedVerifiedTestAccount();
  await loginTestAccount(page.request, account);
  const accountId = await readAccountId(page);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Перенести прогресс" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Прогресс перенесён" })).toBeVisible();
  await expectStat(page, "completed", 1);
  await expect(heatmap(page).locator('[data-date][data-level="0"]')).toHaveCount(365);
  await writeProgress(page, accountId, { action: "finish", lessonId: socratic, sceneId: INTRO_LESSONS[socratic].scenes.at(-1)!.id });
  await page.reload();
  await expectStat(page, "completed", 1);
  await expect(heatmap(page).locator('[data-date][data-level="0"]')).toHaveCount(365);

  const final = await prepareFinish(page, accountId, intro);
  await writeProgress(page, accountId, { action: "finish", lessonId: intro, sceneId: final });
  await page.reload();
  await expectStat(page, "completed", 2);
  await expect(dayCell(page, isoDate(getMoscowDay()))).toHaveAttribute("data-level", "1");
  expect((await postAccount(page.request, "withdraw-consent", { accountId, confirm: true, password: account.password })).ok()).toBe(true);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);

  const db = openAccountDatabase(accountTestSettings().database);
  try {
    expect(db.prepare("SELECT count(*) AS total FROM account_lesson_progress WHERE user_id = ?").get(accountId)?.total).toBe(0);
    expect(db.prepare("SELECT count(*) AS total FROM account_slide_progress WHERE user_id = ?").get(accountId)?.total).toBe(0);
  } finally {
    db.close();
  }
});
