import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const id = "plato-virtue-definition";
const url = (scene: string) => `/learn#lesson=${id}&scene=${scene}`;
const prefix = "sophia.lesson-progress.v2:";
const first = "Можно ли научиться быть хорошим?";
const second = "У добродетели много лиц";
const fourth = "Пример или определение?";

async function navigator(page: Page) {
  const desktop = page.getByRole("navigation", { name: "Слайды урока", exact: true });
  if ((page.viewportSize()?.width ?? 0) >= 1000) return desktop;
  await page.getByRole("button", { name: /^Слайды · / }).click();
  return page.getByRole("dialog", { name: /^Слайды урока/ });
}

async function records(page: Page) {
  return page.evaluate(prefix => Object.keys(localStorage).filter(key => key.startsWith(prefix)).sort(), prefix);
}

test("direct navigation follows URL history without credit", async ({ page }) => {
  await page.goto(url("meno-question"));
  const list = await navigator(page);
  await expect(list.getByRole("button", { name: /Не пройден/ })).toHaveCount(5);
  await list.getByRole("button", { name: new RegExp(fourth.replace("?", "\\?")) }).click();
  await expect(page).toHaveURL(/scene=virtue-definition-practice$/);
  await (await navigator(page)).getByRole("button", { name: new RegExp(second) }).click();
  await expect(page).toHaveURL(/scene=virtue-many-faces$/);
  await page.goBack();
  await expect(page.getByRole("heading", { name: fourth, exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { name: second, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: second, exact: true })).toBeVisible();
  expect(await records(page)).toEqual([]);
});

test("a final action confirms a slide and replay preserves the confirmation", async ({ page }) => {
  await page.goto(url("meno-question"));
  const lesson = page.getByTestId("lesson-introduction");
  await expect(lesson.getByRole("heading", { name: first, exact: true })).toBeVisible();
  const next = lesson.getByRole("button", { name: "Продолжить", exact: true });
  await next.click();
  await lesson.getByRole("button", { name: "Пока не знаю", exact: true }).click();
  for (let count = 0; count < 3; count++) {
    await next.click();
    expect(await records(page)).toEqual([]);
  }
  await lesson.getByRole("button", { name: "Продолжить урок", exact: true }).click();
  await expect.poll(() => records(page)).toEqual([`${prefix}slide:${id}:meno-question`]);
  await page.reload();
  await (await navigator(page)).getByRole("button", { name: /Можно ли научиться быть хорошим.*Пройден$/ }).click();
  await expect(lesson.getByRole("heading", { name: first, exact: true })).toBeVisible();
  await lesson.getByRole("button", { name: "Повторить сцену", exact: true }).click();
  await expect.poll(() => records(page)).toHaveLength(1);
});

test("two windows confirm different slides of the same lesson", async ({ page, context }) => {
  const intro = "/learn#lesson=plato-introduction&scene=";
  const other = await context.newPage();
  await Promise.all([page.goto(intro + "journey"), other.goto(intro + "athens")]);
  await Promise.all([
    page.getByRole("button", { name: "Начать путешествие", exact: true }).click(),
    other.getByRole("button", { name: "Продолжить", exact: true }).click(),
  ]);
  await expect.poll(() => records(page)).toHaveLength(2);
  await expect.poll(() => records(other)).toEqual(await records(page));
  const list = await navigator(page);
  await expect(list.getByRole("button", { name: /\sПройден$/ })).toHaveCount(2);
});

test("the navigator preserves an unfinished workshop draft across reload", async ({ page }) => {
  await page.goto("/learn#lesson=plato-socratic-question&scene=courage-question");
  const workshop = page.getByTestId("workshop-scene");
  const next = workshop.getByRole("button", { name: "Далее", exact: true });
  await expect(async () => {
    await next.click();
    await expect(workshop.getByText("2 / 3", { exact: true })).toBeVisible({ timeout: 650 });
  }).toPass();
  await expect(async () => {
    await next.click();
    await expect(workshop.getByRole("textbox")).toBeVisible({ timeout: 650 });
  }).toPass();
  await workshop.getByRole("textbox").fill("Что ты понимаешь под смелостью?");
  await (await navigator(page)).getByRole("button", { name: /Почему Сократ задавал вопросы/ }).click();
  await page.reload();
  await (await navigator(page)).getByRole("button", { name: /Теперь ты на месте Сократа/ }).click();
  await expect(workshop.getByRole("textbox")).toHaveValue("Что ты понимаешь под смелостью?");
  expect(await records(page)).toEqual([]);
});

for (const width of [390, 768, 1024, 1440]) {
  test(`navigator at ${width}px supports keyboard and reduced motion`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(url("meno-question"));
    const nav = await navigator(page);
    await expect(nav.getByRole("button", { name: /Не пройден/ })).toHaveCount(5);
    const target = nav.getByRole("button", { name: /4\. Пример или определение/ });
    await expect(target).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const selector = width >= 1000 ? "nav[aria-label='Слайды урока']" : "dialog[open]";
    expect((await new AxeBuilder({ page }).include(selector).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
    if (width === 390 || width === 1440) {
      await page.screenshot({ path: info.outputPath(`navigator-${width}.png`), animations: "disabled" });
    }
    if (width < 1000) {
      await page.keyboard.press("Escape");
      const opener = page.getByRole("button", { name: "Слайды · 0/5" });
      await expect(opener).toBeFocused();
      await opener.press("Enter");
    }
    await target.press("Enter");
    await expect(page.getByRole("heading", { name: fourth, exact: true })).toBeVisible();
    if (width < 1000) {
      await expect(nav).toBeHidden();
      await expect(page.getByRole("button", { name: "Слайды · 0/5" })).toBeFocused();
    }
    expect(await records(page)).toEqual([]);
  });
}
