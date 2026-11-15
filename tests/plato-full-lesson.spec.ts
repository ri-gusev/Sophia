import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openLesson(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn");
  await page.locator('[data-node-id="plato"]').click();
  await page.getByRole("button", { name: "Сократ и рождение философского вопроса", exact: true }).click();
  await page.getByRole("button", { name: "Кто такой Платон?", exact: true }).click();
  return page.getByTestId("lesson-introduction");
}

test("complete nine-scene journey checks answers, retains work and returns to the catalog", async ({ page }, testInfo) => {
  const apiCalls: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls.push(request.url()); });
  const lesson = await openLesson(page);
  const heading = lesson.getByRole("heading", { level: 2 });
  const next = () => lesson.getByRole("button", { name: "Продолжить", exact: true });
  await expect(heading).toHaveText("Кто такой Платон?");
  await expect(lesson.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "9");
  await lesson.screenshot({ path: testInfo.outputPath("01-journey.png"), style: ".site-header,.skip-link { visibility:hidden !important; }" });
  await lesson.getByRole("button", { name: "Начать путешествие", exact: true }).click();
  await expect(heading).toHaveText("Афины, V век до н. э.");
  await next().click();
  await expect(heading).toHaveText("Философ, который мог стать поэтом");
  await expect(next()).toBeDisabled();
  await expect(lesson.getByRole("button", { name: "Проверить", exact: true })).toBeDisabled();
  await lesson.getByRole("radio").nth(0).check();
  await expect(lesson.getByTestId("exercise-feedback")).toHaveCount(0);
  await lesson.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(lesson.getByTestId("exercise-feedback")).toContainText("Это античное предание, но его достоверность неизвестна.");
  await lesson.screenshot({ path: testInfo.outputPath("03-question.png"), style: ".site-header,.skip-link { visibility:hidden !important; }" });
  await next().click();
  await expect(heading).toHaveText("Человек, который задавал вопросы");
  await lesson.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(lesson.getByRole("radio").nth(0)).toBeChecked();
  await expect(next()).toBeEnabled();
  await next().click();
  await lesson.getByRole("radio").nth(1).check();
  await lesson.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(lesson.getByTestId("exercise-feedback")).toContainText("Именно!");
  await next().click();
  await expect(heading).toHaveText("Событие, изменившее многое");
  await expect(lesson).toContainText("399 год до нашей эры");
  await next().click();
  await expect(heading).toHaveText("Место, где учились мыслить");
  const down = lesson.getByRole("button", { name: "Аристотель: переместить ниже", exact: true });
  await down.focus();
  await page.keyboard.press("Enter");
  await lesson.getByRole("button", { name: "Аристотель: переместить ниже", exact: true }).click();
  await expect(lesson.getByTestId("ordering-item-name")).toHaveText(["Сократ", "Платон", "Аристотель"]);
  await lesson.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(lesson.getByTestId("exercise-feedback")).toContainText("Отлично!");
  await next().click();
  await expect(heading).toHaveText("Почему Платон писал диалоги?");
  await lesson.getByRole("radio").nth(1).check();
  await lesson.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(lesson.getByTestId("exercise-feedback")).toContainText("Правильно!");
  await next().click();
  await expect(heading).toHaveText("Почему мы изучаем Платона?");
  await expect(lesson).toContainText("Авторская формулировка Sophia");
  await lesson.getByRole("button", { name: "Завершить урок", exact: true }).click();
  await expect(heading).toHaveText("Знакомство состоялось!");
  await expect(lesson.getByRole("list", { name: "Что ты узнал" }).getByRole("listitem")).toHaveCount(5);
  const axe = await new AxeBuilder({ page }).include('[data-testid="lesson-introduction"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations).toEqual([]);
  await lesson.screenshot({ path: testInfo.outputPath("09-completion.png"), style: ".site-header,.skip-link { visibility:hidden !important; }" });
  await lesson.getByRole("button", { name: "Вернуться к курсу", exact: true }).click();
  await expect(lesson).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Платон", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/learn$/);
  expect(apiCalls).toEqual([]);
});

test("reload restores the exact scene and checked exercise; incorrect ordering explains and permits progress", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn#lesson=plato-introduction&scene=academy");
  const lesson = page.getByTestId("lesson-introduction");
  await expect(lesson.getByRole("heading", { level: 2 })).toHaveText("Место, где учились мыслить");
  await lesson.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(lesson.getByTestId("exercise-feedback")).toContainText("Правильная последовательность: Сократ → Платон → Аристотель.");
  await page.reload();
  await expect(lesson.getByTestId("exercise-feedback")).toBeVisible();
  await expect(lesson.getByRole("heading", { level: 2 })).toBeInViewport();
  await lesson.getByRole("button", { name: "Продолжить", exact: true }).click();
  await lesson.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(lesson.getByTestId("ordering-item-name")).toHaveText(["Аристотель", "Сократ", "Платон"]);
  await expect(lesson.getByTestId("exercise-feedback")).toBeVisible();
  await lesson.getByRole("button", { name: "Закрыть урок", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Платон", exact: true })).toBeVisible();
});

test("other choice exercises explain mistakes and work entirely from the keyboard", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [id, feedback] of [
    ["socrates", "Главная задача здесь — не выяснить авторитет собеседника и не оскорбить его"],
    ["dialogues", "Сократ был реальным историческим философом, а автором диалогов был Платон."],
  ]) {
    await page.goto(`/learn#lesson=plato-introduction&scene=${id}`);
    const lesson = page.getByTestId("lesson-introduction");
    await expect(lesson.getByTestId("lesson-scene")).toHaveAttribute("data-scene-id", id);
    const first = lesson.getByRole("radio").nth(0);
    await first.focus();
    await page.keyboard.press("Space");
    await expect(first).toBeChecked();
    await expect(lesson.getByTestId("exercise-feedback")).toHaveCount(0);
    await lesson.getByRole("button", { name: "Проверить", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(lesson.getByTestId("exercise-feedback")).toContainText(feedback);
    await expect(lesson.getByTestId("exercise-feedback")).toBeFocused();
    await expect(lesson.getByRole("button", { name: "Продолжить", exact: true })).toBeEnabled();
  }
});

test("blocked tab storage does not prevent navigation or restoring the scene from its URL", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("Storage disabled", "SecurityError"); } });
  });
  const lesson = await openLesson(page);
  await lesson.getByRole("button", { name: "Начать путешествие", exact: true }).click();
  await expect(lesson.getByRole("heading", { level: 2 })).toHaveText("Афины, V век до н. э.");
  await page.reload();
  await expect(lesson.getByRole("heading", { level: 2 })).toHaveText("Афины, V век до н. э.");
});
