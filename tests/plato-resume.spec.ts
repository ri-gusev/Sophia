import { expect, test, type Locator, type Page } from "@playwright/test";

async function advance(scene: Locator, count: number) {
  for (let i = 0; i < count; i++) {
    // Illustrated dialogues intentionally guard against double clicks.
    await scene.page().waitForTimeout(420);
    await scene.getByRole("button", { name: "Далее", exact: true }).click();
  }
}
async function reload(page: Page) {
  await page.reload();
  await expect(page.getByTestId("lesson-introduction")).toBeVisible();
  await expect(page.locator("h2:focus, h3:focus")).toHaveCount(0);
  await expect(page.locator('[data-testid="lesson-introduction"] h2[tabindex], [data-testid="lesson-introduction"] h3[tabindex]')).toHaveCount(0);
}

test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

test("reload preserves a scene's stage, choice and scroll without focusing headings", async ({ page }) => {
  await page.goto("/learn#lesson=plato-virtue-definition&scene=meno-question");
  const scene = page.getByTestId("virtue-intro-scene");
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  await scene.getByRole("button", { name: "Пока не знаю" }).click();
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(scene).toHaveAttribute("data-stage", "2");
  await page.evaluate(() => window.scrollBy(0, 100));
  const scroll = await page.evaluate(() => window.scrollY);
  await page.reload();
  await expect(scene).toHaveAttribute("data-stage", "2");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, -1);
  await expect(page.locator("h2:focus, h3:focus")).toHaveCount(0);
  await scene.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(scene.getByRole("button", { name: "Пока не знаю" })).toHaveAttribute("aria-pressed", "true");
});

test("dialogue restores the current line, revealed explanation and replay", async ({ page }) => {
  await page.goto("/learn#lesson=plato-socratic-question&scene=cephalus");
  const scene = page.getByTestId("dialogue-scene");
  await advance(scene, 2);
  await reload(page);
  await expect(scene.getByTestId("dialogue-counter")).toHaveText("3 / 8");
  await advance(scene, 5);
  await scene.getByRole("button", { name: "Разобрать разговор" }).click();
  await reload(page);
  await expect(scene.getByRole("button", { name: "Продолжить урок" })).toBeVisible();
  await scene.getByRole("button", { name: "Повторить диалог" }).click();
  await reload(page);
  await expect(scene.getByTestId("dialogue-counter")).toHaveText("1 / 8");
});

test("mentor restores its line and preserves the reader's position at the conclusion", async ({ page }) => {
  await page.goto("/learn#lesson=plato-socratic-question&scene=socratic-questions");
  const scene = page.getByTestId("mentor-scene");
  await advance(scene, 2);
  const speech = await scene.getByRole("status").textContent();
  await reload(page);
  await expect(scene.getByRole("status")).toHaveText(speech!);
  await advance(scene, 3);
  await expect(scene.getByRole("button", { name: "Продолжить урок" })).toBeVisible();
  await page.waitForTimeout(2100);
  await scene.getByRole("heading", { level: 2 }).scrollIntoViewIfNeeded();
  const top = await page.evaluate(() => scrollY);
  await reload(page);
  await expect(scene.getByRole("button", { name: "Продолжить урок" })).toBeVisible();
  await page.waitForTimeout(2200);
  expect(Math.abs(await page.evaluate(() => scrollY) - top)).toBeLessThan(4);
});

test("practice restores wrong and correct answers without rechecking", async ({ page }) => {
  await page.goto("/learn#lesson=plato-socratic-question&scene=always-true");
  const scene = page.getByTestId("practice-scene");
  await advance(scene, 2);
  await scene.getByRole("radio").first().check();
  await scene.getByRole("button", { name: "Проверить", exact: true }).click();
  await reload(page);
  await expect(scene.getByRole("radio").first()).toBeChecked();
  await expect(scene).toContainText("Подумай ещё");
  await scene.getByRole("radio").nth(1).check();
  await scene.getByRole("button", { name: "Проверить", exact: true }).click();
  await reload(page);
  await expect(scene.getByRole("radio").nth(1)).toBeChecked();
  await expect(scene.getByRole("button", { name: "Продолжить урок" })).toBeVisible();
});

test("workshop restores draft, hint, example, editing and explicit reset", async ({ page }) => {
  await page.goto("/learn#lesson=plato-socratic-question&scene=courage-question");
  const scene = page.getByTestId("workshop-scene");
  await advance(scene, 2);
  await scene.getByRole("textbox").fill("Может ли смелый человек испытывать страх?");
  await scene.getByRole("button", { name: "Получить подсказку" }).click();
  await reload(page);
  await expect(scene.getByRole("textbox")).toHaveValue("Может ли смелый человек испытывать страх?");
  await expect(scene.getByRole("button", { name: "Получить подсказку" })).toHaveAttribute("aria-expanded", "true");
  await scene.getByRole("button", { name: "Сравнить с вопросом Сократа" }).click();
  await reload(page);
  await expect(scene.getByRole("heading", { name: "Твой вопрос", exact: true })).toBeVisible();
  await scene.getByRole("button", { name: "Изменить свой вопрос" }).click();
  await expect(scene.getByRole("textbox")).toBeEditable();
  await scene.getByRole("button", { name: "Сравнить с вопросом Сократа" }).click();
  await scene.getByRole("button", { name: "Повторить задание" }).click();
  await reload(page);
  await expect(scene.getByRole("textbox")).toHaveCount(0);
  await advance(scene, 2);
  await expect(scene.getByRole("textbox")).toHaveValue("");
});

test("reflection restores the summary without completing the lesson", async ({ page }) => {
  await page.goto("/learn#lesson=plato-socratic-question&scene=first-step");
  const scene = page.getByTestId("reflection-scene");
  await advance(scene, 2);
  await scene.getByRole("button", { name: "Посмотреть итоги" }).click();
  await reload(page);
  await expect(scene.getByRole("heading", { name: "Чему ты научился?" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sophia.lesson-completions.v1"))).toBeNull();
});

test("gallery restores open cards, visited examples and revealed mosaic", async ({ page }) => {
  await page.goto("/learn#lesson=plato-virtue-definition&scene=virtue-many-faces");
  const scene = page.getByTestId("virtue-gallery-scene");
  await scene.getByRole("button", { name: "Посмотреть примеры" }).click();
  await scene.getByRole("button", { name: "Управлять городом" }).click();
  await reload(page);
  await expect(scene.getByRole("status")).toHaveText("Изучено: 1 из 3");
  await expect(scene.getByRole("button", { name: "Управлять городом" })).toHaveAttribute("aria-expanded", "true");
  await scene.getByRole("button", { name: "Заботиться о доме" }).click();
  await scene.getByRole("button", { name: "Поступать достойно в своём возрасте" }).click();
  await scene.getByRole("button", { name: "Что скажет Сократ?" }).click();
  await advance(scene, 1);
  await scene.getByRole("button", { name: "Открыть объяснение" }).click();
  await reload(page);
  await expect(scene.locator('[data-layout="mosaic"]')).toBeVisible();
  await expect(scene.getByRole("button", { name: "Продолжить урок" })).toBeVisible();
});

test("swarm restores modes, retries, final parallel and replay", async ({ page }) => {
  await page.goto("/learn#lesson=plato-virtue-definition&scene=virtue-swarm");
  const scene = page.getByTestId("virtue-swarm-scene");
  await advance(scene, 2);
  await scene.getByRole("button", { name: "Посмотреть на рой" }).click();
  await scene.getByRole("button", { name: "Приостановить движение" }).click();
  await scene.getByRole("button", { name: "Исследовать рой" }).click();
  await scene.getByRole("button", { name: "Что их объединяет?", exact: true }).click();
  await reload(page);
  await expect(scene.getByRole("status")).toHaveText("Исследовано: 1 из 2 способов");
  await expect(scene.getByRole("button", { name: "Что их объединяет?", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(scene.getByTestId("swarm-garden")).toHaveAttribute("data-paused", "true");
  await scene.getByRole("button", { name: "Чем отличаются?", exact: true }).click();
  await scene.getByRole("button", { name: "А при чём здесь добродетель?" }).click();
  await advance(scene, 1);
  await scene.getByRole("button", { name: "Попробовать самому" }).click();
  await scene.getByRole("button", { name: "Сколько всего существует добродетелей?" }).click();
  await reload(page);
  await expect(scene.getByRole("status")).toContainText("Это тоже может быть интересным");
  await scene.getByRole("button", { name: "Что общего у всех добродетелей?" }).click();
  await scene.getByRole("button", { name: "Открыть общую мысль" }).click();
  await scene.getByRole("button", { name: "А добродетели?" }).click();
  await reload(page);
  await expect(scene.getByText("Мысль урока · Sophia")).toBeVisible();
  await scene.getByRole("button", { name: "Повторить сцену" }).click();
  await reload(page);
  await expect(scene.getByRole("heading", { name: "Неожиданная аналогия" })).toBeVisible();
});

test("blocked or malformed resume storage leaves the lesson usable", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("sophia.lesson-resume.v1:plato-socratic-question", JSON.stringify({
      version: 1, scenes: { cephalus: { turn: 999, complete: "invalid" } }, scroll: { cephalus: -1 },
    }));
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "QuotaExceededError"); };
  });
  await page.goto("/learn#lesson=plato-socratic-question&scene=cephalus");
  const scene = page.getByTestId("dialogue-scene");
  await expect(scene.getByTestId("dialogue-counter")).toHaveText("1 / 8");
  await advance(scene, 1);
  await expect(scene.getByTestId("dialogue-counter")).toHaveText("2 / 8");
});

test("reading position is relative to the slide when the catalog above it disappears", async ({ page }) => {
  await page.goto("/learn");
  await page.locator('[data-node-id="plato"]').click();
  await page.getByRole("button", { name: "Сократ и рождение философского вопроса", exact: true }).click();
  await page.getByRole("button", { name: "Кто такой Платон?", exact: true }).click();
  const header = page.getByTestId("lesson-scene-header");
  await expect(header).toBeVisible();
  await expect.poll(() => header.evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(150);
  await page.evaluate(() => scrollBy(0, 90));
  const offset = await header.evaluate(element => element.getBoundingClientRect().top);
  await page.reload();
  await expect(header).toBeVisible();
  await expect.poll(() => header.evaluate(element => element.getBoundingClientRect().top)).toBeCloseTo(offset, -1);
});

test("each ordinary slide restores its Sources disclosure and reading position", async ({ page }) => {
  await page.goto("/learn#lesson=plato-introduction&scene=journey");
  const disclosure = page.getByTestId("lesson-introduction").locator("details");
  await disclosure.locator("summary").click();
  await expect(disclosure).toHaveAttribute("open", "");
  await disclosure.getByText("Происхождение иллюстраций", { exact: true }).scrollIntoViewIfNeeded();
  const top = await disclosure.evaluate(element => element.getBoundingClientRect().top);
  await reload(page);
  await expect(disclosure).toHaveAttribute("open", "");
  await expect.poll(() => disclosure.evaluate(element => element.getBoundingClientRect().top)).toBeCloseTo(top, -1);
  await disclosure.locator("summary").click();
  await reload(page);
  await expect(disclosure).not.toHaveAttribute("open", "");
});
