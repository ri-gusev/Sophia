import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const url = "/learn#lesson=plato-virtue-definition&scene=virtue-lesson-finale";
const key = "sophia.lesson-completions.v1";
const lessonId = "plato-virtue-definition";
async function press(scene: Locator, name: string) {
  await scene.getByRole("button", { name, exact: true }).click();
}
async function toSummary(scene: Locator) {
  for (const label of ["Далее", "Далее", "Вспомнить наше исследование", "Вспомнить путь", "Какой?", "Далее", "Посмотреть итоги"]) await press(scene, label);
}

test("virtue finale opens without completing the lesson", async ({ page }) => {
  await page.goto(url);
  await expect(page.getByText("Слайд 5 из 5")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Мы только начали" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sophia.lesson-completions.v1"))).toBeNull();
  const scene = page.getByTestId("virtue-finale-scene");
  await toSummary(scene);
  await press(scene, "Назад");
  await expect(scene.getByText("И какую роль играет природа человека?")).toBeVisible();
  await press(scene, "Назад");
  await expect(scene.getByRole("button", { name: "Далее", exact: true })).toBeVisible();
  await press(scene, "Вернуться в каталог");
  await expect(page.getByTestId("philosopher-catalog")).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
});

test("finale resumes, preserves other completions, saves idempotently and shows catalog status", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(url);
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify(["plato-socratic-question"])), key);
  const scene = page.getByTestId("virtue-finale-scene");
  async function shot(name: string) {
    const art = scene.getByRole("img").first();
    await art.scrollIntoViewIfNeeded();
    await expect.poll(() => art.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await scene.screenshot({ path: info.outputPath(name), animations: "disabled", style: ".site-header,.skip-link { visibility:hidden!important; }" });
  }
  await expect(scene.getByRole("status")).toContainText("Менон");
  await shot("01-garden.png");
  const next = scene.getByRole("button", { name: "Далее", exact: true });
  await next.focus(); await next.press("Enter");
  await expect(scene.getByRole("status")).toContainText("Сократ");
  await page.reload();
  await expect(scene.getByRole("status")).toContainText("прежние ответы");
  await shot("02-dialogue.png");
  await press(scene, "Далее"); await press(scene, "Вспомнить наше исследование");
  await expect(scene.locator('[data-lit="true"]')).toHaveCount(0);
  await shot("03-path-start.png");
  await press(scene, "Вспомнить путь");
  await expect(scene.locator('[data-lit="true"]')).toHaveCount(4);
  await shot("04-path.png");
  await page.reload();
  await expect(scene.getByText("Но один вопрос остался открытым…")).toBeVisible();
  await scene.getByText("Но один вопрос остался открытым…").screenshot({ path: info.outputPath("05-open-question.png"), animations: "disabled" });
  await press(scene, "Какой?");
  await expect(scene.getByRole("heading", { name: "Можно ли научиться добродетели?" })).toBeVisible();
  await press(scene, "Далее");
  await expect(scene.getByText("И какую роль играет природа человека?")).toBeVisible();
  await shot("06-initial-question.png");
  await press(scene, "Посмотреть итоги");
  await expect(scene.getByRole("listitem")).toHaveCount(3);
  await expect(scene.getByRole("radio")).toHaveCount(0);
  await expect(scene.getByText("Мысль урока · Sophia")).toBeVisible();
  await shot("07-summary.png");
  await scene.getByRole("button", { name: "Завершить урок", exact: true }).screenshot({ path: info.outputPath("08-finish.png"), animations: "disabled" });
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).toEqual(["plato-socratic-question"]);
  await press(scene, "Завершить урок");
  const catalog = page.getByTestId("philosopher-catalog");
  await press(catalog, "Добродетель и правильная жизнь");
  await expect(catalog.getByRole("button", { name: "Что значит быть хорошим человеком?", exact: true })).toContainText("Пройдено");
  await catalog.screenshot({ path: info.outputPath("10-catalog.png"), animations: "disabled" });
  await page.goto(url); await page.reload();
  await expect(scene.getByRole("heading", { name: "Первое исследование завершено" })).toBeVisible();
  await press(scene, "Повторить заключение");
  await expect(scene.getByRole("status")).toContainText("Менон");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).toEqual(["plato-socratic-question", lessonId]);
  await toSummary(scene); await press(scene, "Завершить урок");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).toEqual(["plato-socratic-question", lessonId]);
  expect(errors).toEqual([]);
});

test("completion failure keeps the summary open and can be retried", async ({ page }) => {
  await page.goto(url);
  const scene = page.getByTestId("virtue-finale-scene");
  await toSummary(scene);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) {
        Storage.prototype.setItem = original;
        throw new DOMException("Blocked", "QuotaExceededError");
      }
      original.call(this, name, value);
    };
  }, key);
  await press(scene, "Завершить урок");
  await expect(scene.getByRole("alert")).toContainText("Не удалось сохранить завершение");
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  await press(scene, "Завершить урок");
  await expect(page.getByTestId("philosopher-catalog")).toBeVisible();
});

for (const width of [390, 768, 1024, 1440]) test(`finale at ${width}px supports reduced motion and accessibility`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  const scene = page.getByTestId("virtue-finale-scene");
  async function verify() {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await scene.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    expect((await new AxeBuilder({ page }).include('[data-testid="virtue-finale-scene"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  }
  for (const label of ["Далее", "Далее", "Вспомнить наше исследование", "Вспомнить путь"]) await press(scene, label);
  await verify();
  for (const label of ["Какой?", "Далее", "Посмотреть итоги"]) await press(scene, label);
  await verify();
  await scene.screenshot({ path: info.outputPath(`09-finale-${width}.png`), style: ".site-header,.skip-link { visibility:hidden!important; }" });
});
