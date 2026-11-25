import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginTestAccount, seedVerifiedTestAccount } from "./support/accounts";

const noonMoscow = new Date("2026-11-25T09:00:00Z");
const quiz = (page: Page) => page.getByRole("group", { name: "Вопрос дня", exact: true });
const answers = (page: Page) => quiz(page).getByRole("radio");
const confirm = (page: Page) => quiz(page).getByRole("button", { name: "Проверить ответ", exact: true });
const streak = (page: Page) => quiz(page).getByRole("button", { name: /^Ежедневная серия/ });

test.use({ timezoneId: "America/Los_Angeles" });

async function openQuiz(page: Page, date = noonMoscow) {
  await page.clock.setFixedTime(date);
  await page.goto("/");
  await expect(answers(page)).toHaveCount(3);
}

async function choose(page: Page, option: number) {
  await answers(page).nth(option).check();
  await expect(confirm(page)).toBeEnabled();
}

async function logout(page: Page) {
  await page.goto("/profile");
  await page.getByRole("main").getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("confirms a correct keyboard answer once and restores a lit streak without replaying the animation", async ({ page }) => {
  await openQuiz(page);
  await expect(quiz(page).getByText("25 ноября 2026 г.")).toBeVisible();
  await expect(streak(page)).toHaveText("0");
  await expect(streak(page)).toHaveAttribute("data-state", "inactive");
  await expect(confirm(page)).toBeDisabled();
  await expect(answers(page).first()).toBeEnabled();
  await quiz(page).screenshot({ path: test.info().outputPath("quiz-before.png") });
  await answers(page).nth(0).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(answers(page).nth(1)).toBeChecked();
  await expect(streak(page)).toHaveText("0");
  await confirm(page).click();
  await expect(quiz(page).getByRole("status")).toContainText("Верно!");
  await expect(quiz(page).getByRole("status")).toBeFocused();
  await expect(quiz(page).getByRole("link")).toHaveAttribute("href", /^https:\/\//);
  await expect(streak(page)).toHaveAttribute("data-state", "active");
  await expect(streak(page)).toHaveAttribute("data-celebrating", "true");
  await expect(streak(page)).toHaveText("1");
  await expect(quiz(page).getByRole("timer")).toContainText("12:00:00");
  await expect(confirm(page)).toHaveCount(0);
  await page.reload();
  await expect(streak(page)).toHaveText("1");
  await expect(streak(page)).toHaveAttribute("data-state", "active");
  await expect(streak(page)).not.toHaveAttribute("data-celebrating", "true");
  await expect(answers(page).nth(1)).toBeChecked();
  await expect(quiz(page).getByRole("status")).toContainText("Верно!");
  await quiz(page).screenshot({ path: test.info().outputPath("quiz-after.png") });
});

test("a wrong answer extends the series with reduced motion and a missed day resets it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openQuiz(page);
  await choose(page, 0);
  await confirm(page).click();
  await expect(quiz(page).getByRole("status")).toContainText("Не совсем!");
  await expect(quiz(page).getByText("Ваш ответ", { exact: true })).toBeVisible();
  await expect(quiz(page).getByText("Правильный ответ", { exact: true })).toBeVisible();
  await expect(quiz(page).locator("[data-result=incorrect]")).toHaveCSS("background-color", "rgb(246, 234, 234)");
  await expect(quiz(page).locator("[data-result=correct]")).toHaveCSS("background-color", "rgb(233, 243, 233)");
  await expect(streak(page)).toHaveText("1");
  expect(await streak(page).locator("svg").evaluate(node => getComputedStyle(node).animationName)).toBe("none");

  await openQuiz(page, new Date("2026-11-26T09:00:00Z"));
  await expect(streak(page)).toHaveText("1");
  await expect(streak(page)).toHaveAttribute("data-state", "inactive");
  await streak(page).click();
  await expect(quiz(page).getByText("Ответьте на вопрос дня, чтобы продлить серию")).toBeVisible();
  await choose(page, 0);
  await confirm(page).click();
  await expect(streak(page)).toHaveText("2");

  await openQuiz(page, new Date("2026-11-28T09:00:00Z"));
  await expect(streak(page)).toHaveText("0");
  await choose(page, 0);
  await confirm(page).click();
  await expect(streak(page)).toHaveText("1");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("sophia.daily-quiz.v1") ?? "null"));
  expect(stored).toMatchObject({ lastDate: "2026-11-28", streak: 1, maxStreak: 2 });
});

test("changes question and resets the draft at Moscow midnight without navigation", async ({ page }) => {
  const start = new Date("2026-12-31T20:59:57.000Z");
  await page.clock.install({ time: start.getTime() - 3_000 });
  await page.clock.pauseAt(start);
  await page.goto("/");
  const date = quiz(page).locator("time[datetime]");
  const question = quiz(page).getByRole("radiogroup");
  await expect(date).toHaveAttribute("datetime", "2026-12-31");
  const previous = await question.getAttribute("aria-labelledby");
  await choose(page, 0);
  await page.clock.fastForward(3_100);
  await expect(date).toHaveAttribute("datetime", "2027-01-01");
  await expect(question).not.toHaveAttribute("aria-labelledby", previous ?? "");
  await expect(confirm(page)).toBeDisabled();
  await expect(streak(page)).toHaveText("0");
});

test("simultaneous confirmations converge on one answer in open tabs", async ({ page, context }) => {
  const other = await context.newPage();
  await Promise.all([openQuiz(page), openQuiz(other)]);
  await Promise.all([choose(page, 0), choose(other, 1)]);
  await Promise.all([page, other].map(tab => confirm(tab).evaluate(button => {
    if (button instanceof HTMLButtonElement) {
      button.click();
      button.click();
    }
  })));
  await expect(streak(page)).toHaveText("1");
  await expect(streak(other)).toHaveText("1");
  await expect(answers(other).nth(await answers(page).nth(0).isChecked() ? 0 : 1)).toBeChecked();
  await expect(quiz(page).getByRole("status")).toContainText("Серия продлена");
  await expect(quiz(other).getByRole("status")).toContainText("Серия продлена");
});

test("isolates guest and two account series in one browser", async ({ page }) => {
  const [first, second] = await Promise.all([seedVerifiedTestAccount(), seedVerifiedTestAccount()]);
  await openQuiz(page);
  await choose(page, 0);
  await confirm(page).click();
  await expect(streak(page)).toHaveText("1");
  await loginTestAccount(page.request, first);
  await openQuiz(page);
  await expect(streak(page)).toHaveText("0");
  await choose(page, 1);
  await confirm(page).click();
  await expect(streak(page)).toHaveText("1");
  await logout(page);
  await loginTestAccount(page.request, second);
  await openQuiz(page);
  await expect(streak(page)).toHaveText("0");
  await logout(page);
  await loginTestAccount(page.request, first);
  await openQuiz(page);
  await expect(answers(page).nth(1)).toBeChecked();
  await logout(page);
  await openQuiz(page);
  await expect(answers(page).nth(0)).toBeChecked();
});

test("recovers a corrupt snapshot, fits a narrow screen and passes accessibility checks after answering", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openQuiz(page);
  await page.evaluate(() => localStorage.setItem("sophia.daily-quiz.v1", "{broken"));
  await page.reload();
  await expect(streak(page)).toHaveText("0");
  await choose(page, 0);
  await confirm(page).click();
  await expect(streak(page)).toHaveText("1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const result = await new AxeBuilder({ page }).include("#exercise").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
});
