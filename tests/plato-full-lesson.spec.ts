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
  const portrait = lesson.getByRole("img", { name: "Мраморный бюст Платона", exact: true });
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate(node => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0)).toBe(true);
  if (page.viewportSize()!.width > 1000) {
    const portraitBox = await portrait.boundingBox();
    const storyBox = await lesson.getByText("Представь человека, жившего почти две с половиной тысячи лет назад.", { exact: true }).boundingBox();
    expect(portraitBox!.x).toBeGreaterThan(storyBox!.x + storyBox!.width);
    expect(portraitBox!.width).toBeGreaterThanOrEqual(280);
  }
  await expect(lesson.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "9");
  await lesson.screenshot({ path: testInfo.outputPath("01-journey.png"), style: ".site-header,.skip-link { visibility:hidden !important; }" });
  await lesson.getByRole("button", { name: "Начать путешествие", exact: true }).click();
  await expect(heading).toHaveText("Афины, V век до н. э.");
  await expect(portrait).toHaveCount(0);
  const map = lesson.getByRole("img", { name: "Карта Греции с отметкой Афин", exact: true });
  await expect(map).toBeVisible();
  await expect(map.getByText("Афины", { exact: true })).toBeVisible();
  const mapBox = await map.boundingBox();
  const athensText = await lesson.getByText("Именно в этом мире начиналась история будущего философа.", { exact: true }).boundingBox();
  if (page.viewportSize()!.width > 1000) {
    expect(mapBox!.x).toBeGreaterThan(athensText!.x + athensText!.width);
    // The primary button rises 2 px on hover; compare its resting position.
    await heading.hover();
    await expect.poll(async () => {
      const nextBox = await next().boundingBox();
      const currentMapBox = await map.boundingBox();
      return Math.abs(currentMapBox!.y + currentMapBox!.height - nextBox!.y - nextBox!.height + 32);
    }).toBeLessThan(1);
  }
  else if (page.viewportSize()!.width <= 760) expect(mapBox!.y).toBeGreaterThan(athensText!.y + athensText!.height);
  await lesson.screenshot({ path: testInfo.outputPath("02-athens-map.png"), style: ".site-header,.skip-link { visibility:hidden !important; }" });
  await next().click();
  await expect(map).toHaveCount(0);
  await expect(heading).toHaveText("Философ, который мог стать поэтом");
  const question = lesson.getByRole("group", { name: "Что мы можем сказать об истории с сожжёнными трагедиями?", exact: true });
  const questionBox = await question.boundingBox();
  const narrativeBox = await lesson.getByText("Согласно древнему преданию, в юности Платон увлекался поэзией и писал трагедии.", { exact: true }).boundingBox();
  const checkBox = await lesson.getByRole("button", { name: "Проверить", exact: true }).boundingBox();
  if (page.viewportSize()!.width > 900) expect(questionBox!.x).toBeGreaterThan(narrativeBox!.x + narrativeBox!.width);
  else expect(questionBox!.y).toBeGreaterThan(narrativeBox!.y + narrativeBox!.height);
  expect(checkBox!.y).toBeGreaterThanOrEqual(questionBox!.y + questionBox!.height);
  expect(Math.abs(checkBox!.x - questionBox!.x)).toBeLessThan(1);
  await lesson.screenshot({ path: testInfo.outputPath("03-question-right.png"), style: ".site-header,.skip-link { visibility:hidden !important; }" });
  await expect(next()).toBeDisabled();
  await expect(lesson.getByRole("button", { name: "Проверить", exact: true })).toBeDisabled();
  await lesson.getByRole("radio").nth(0).check();
  await expect(lesson.getByTestId("exercise-feedback")).toHaveCount(0);
  await lesson.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(lesson.getByTestId("exercise-feedback")).toHaveText("Ответ неверный");
  await lesson.screenshot({ path: testInfo.outputPath("03-question.png"), style: ".site-header,.skip-link { visibility:hidden !important; }" });
  await expect(next()).toBeDisabled();
  await page.reload();
  await expect(lesson.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(next()).toBeDisabled();
  await lesson.getByRole("radio").nth(1).check();
  await expect(lesson.getByTestId("exercise-feedback")).toHaveCount(0);
  await expect(next()).toBeDisabled();
  await lesson.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(next()).toBeEnabled();
  await next().click();
  await expect(heading).toHaveText("Человек, который задавал вопросы");
  await lesson.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(lesson.getByRole("radio").nth(1)).toBeChecked();
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
  const down = lesson.getByRole("button", { name: "Аристотель: переместить", exact: true });
  await down.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
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

test("reload resets ordering results and the exercise must be solved again", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn#lesson=plato-introduction&scene=academy");
  const lesson = page.getByTestId("lesson-introduction");
  await expect(lesson.getByRole("heading", { level: 2 })).toHaveText("Место, где учились мыслить");
  await lesson.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(lesson.getByTestId("exercise-feedback")).toHaveText("Ответ неверный");
  await page.reload();
  await expect(lesson.getByTestId("exercise-feedback")).toHaveCount(0);
  await expect(lesson.getByRole("heading", { level: 2 })).toBeInViewport();
  const next = lesson.getByRole("button", { name: "Продолжить", exact: true });
  await expect(next).toBeDisabled();
  const down = lesson.getByRole("button", { name: "Аристотель: переместить", exact: true });
  await down.focus();
  await page.keyboard.press("ArrowRight");
  await expect(lesson.getByTestId("exercise-feedback")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(next).toBeDisabled();
  await lesson.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(next).toBeEnabled();
  await page.reload();
  await expect(next).toBeDisabled();
  await expect(lesson.getByTestId("ordering-item-name")).toHaveText(["Аристотель", "Сократ", "Платон"]);
  await expect(lesson.getByTestId("exercise-feedback")).toHaveCount(0);
  await down.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await lesson.getByRole("button", { name: "Проверить", exact: true }).click();
  await lesson.getByRole("button", { name: "Продолжить", exact: true }).click();
  await lesson.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(lesson.getByTestId("ordering-item-name")).toHaveText(["Сократ", "Платон", "Аристотель"]);
  await expect(lesson.getByTestId("exercise-feedback")).toBeVisible();
  await lesson.getByRole("button", { name: "Закрыть урок", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Платон", exact: true })).toBeVisible();
});

test("other choice exercises allow correcting mistakes entirely from the keyboard", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const id of ["socrates", "dialogues"]) {
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
    await expect(lesson.getByTestId("exercise-feedback")).toHaveText("Ответ неверный");
    await expect(lesson.getByTestId("exercise-feedback")).toBeFocused();
    const next = lesson.getByRole("button", { name: "Продолжить", exact: true });
    await expect(next).toBeDisabled();
    const correct = lesson.getByRole("radio").nth(1);
    await correct.focus();
    await page.keyboard.press("Space");
    await expect(correct).toBeChecked();
    await expect(lesson.getByTestId("exercise-feedback")).toHaveCount(0);
    await expect(next).toBeDisabled();
    await lesson.getByRole("button", { name: "Проверить", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(lesson.getByTestId("exercise-feedback")).toBeFocused();
    await expect(next).toBeEnabled();
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

test("old saved answers are ignored and a correct choice resets after reload", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("sophia:lesson:plato-introduction:v1", JSON.stringify({
      version: 1, sceneId: "poet", exercises: { poet: { selected: "b", order: ["a", "b", "c"], checked: true } },
    }));
  });
  await page.goto("/learn#lesson=plato-introduction&scene=poet");
  const lesson = page.getByTestId("lesson-introduction");
  const next = lesson.getByRole("button", { name: "Продолжить", exact: true });
  await expect(lesson.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(lesson.getByTestId("exercise-feedback")).toHaveCount(0);
  await expect(next).toBeDisabled();
  await lesson.getByRole("radio").nth(1).check();
  await lesson.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(next).toBeEnabled();
  await page.reload();
  await expect(lesson.getByTestId("lesson-scene")).toHaveAttribute("data-scene-id", "poet");
  await expect(lesson.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(lesson.getByTestId("exercise-feedback")).toHaveCount(0);
  await expect(next).toBeDisabled();
});
