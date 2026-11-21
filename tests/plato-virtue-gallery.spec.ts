import { test, expect, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const firstUrl = "/learn#lesson=plato-virtue-definition&scene=meno-question";
const secondUrl = "/learn#lesson=plato-virtue-definition&scene=virtue-many-faces";
const examples = ["Поступать достойно в своём возрасте", "Управлять городом", "Заботиться о доме"];

async function examineExamples(scene: Locator) {
  for (const [index, title] of examples.entries()) {
    const card = scene.getByRole("button", { name: title });
    await card.focus();
    await card.press("Enter");
    await expect(card).toHaveAttribute("aria-expanded", "true");
    await expect(card).toContainText("Изучено");
    await expect(scene.getByRole("status")).toHaveText(`Изучено: ${index + 1} из 3`);
  }
}

test("the two slides preserve their state, reveal the mosaic and support replay", async ({ page }, info) => {
  await page.goto(firstUrl);
  const intro = page.getByTestId("virtue-intro-scene");
  const scene = page.getByTestId("virtue-gallery-scene");
  await expect(intro.getByText("Менон", { exact: true })).toBeVisible();
  const next = intro.getByRole("button", { name: "Продолжить", exact: true });
  await next.click();
  await intro.getByRole("button", { name: "Пока не знаю" }).click();
  await next.click();
  await expect(intro.getByRole("heading", { name: "Но что такое добродетель?" })).toBeVisible();
  await next.click();
  await expect(intro.getByText("ἀρετή", { exact: true })).toBeVisible();
  await next.click();
  const continueLesson = intro.getByRole("button", { name: "Продолжить урок" });
  await continueLesson.click();
  await expect(page).toHaveURL(new RegExp("scene=virtue-many-faces$"));
  await expect(scene.getByRole("heading", { level: 2 })).not.toBeFocused();
  await expect(page.getByText("Слайд 2 из 5")).toBeVisible();
  await expect(scene.getByText("Смотри, я приведу несколько примеров.")).toBeVisible();
  const shot = (name: string) => scene.screenshot({
    path: info.outputPath(name), animations: "disabled", scale: "css", style: ".site-header { visibility: hidden; }",
  });
  await shot("01-meno.png");
  await scene.getByRole("button", { name: "Посмотреть примеры" }).click();
  await expect(scene.getByRole("heading", { name: "Примеры Менона" })).not.toBeFocused();
  const socrates = scene.getByRole("button", { name: "Что скажет Сократ?" });
  await expect(socrates).toHaveCount(0);
  await expect(scene.getByRole("status")).toHaveText("Изучено: 0 из 3");
  await shot("02-gallery.png");
  const age = scene.getByRole("button", { name: examples[0] });
  await age.click();
  await expect(scene.getByText("Менон полагает", { exact: false })).toBeVisible();
  await shot("03-open-card.png");
  await age.click();
  await expect(age).toHaveAttribute("aria-expanded", "false");
  await examineExamples(scene);
  await age.click();
  await expect(scene.getByRole("status")).toHaveText("Изучено: 3 из 3");
  await shot("04-all-visited.png");
  await scene.getByRole("button", { name: "К первому слайду" }).click();
  await continueLesson.click();
  await expect(scene.getByRole("status")).toHaveText("Изучено: 3 из 3");
  await socrates.click();
  await expect(scene.getByText("Ты рассказал о разных проявлениях", { exact: false })).toBeVisible();
  await shot("05-socrates.png");
  await expect(scene.getByText("Что общего?", { exact: true })).toHaveCount(0);
  const tiles = scene.locator("[data-virtue-tile]");
  const initialPosition = await tiles.first().boundingBox();
  await scene.getByRole("button", { name: "Далее" }).click();
  await expect(scene.locator('[data-layout="mosaic"]')).toBeVisible();
  await expect(scene.getByRole("group", { name: "Анимация примеров Менона" })).toBeFocused();
  await expect.poll(() => scene.locator('[data-layout="mosaic"]').evaluate(element => {
    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
    return Math.abs(element.getBoundingClientRect().top - headerHeight - 24);
  })).toBeLessThan(3);
  await expect(scene.getByText("Что общего?", { exact: true })).toBeVisible();
  await expect.poll(async () => (await tiles.first().boundingBox())?.width ?? Infinity).toBeLessThan(initialPosition!.width * 0.85);
  await shot("06-mosaic.png");
  await scene.getByRole("button", { name: "Открыть объяснение" }).click();
  await expect(scene.getByRole("group", { name: "Объяснение" })).toBeFocused();
  await expect(scene.getByText("Назвать примеры", { exact: false })).toBeVisible();
  await shot("07-reflection.png");
  await scene.getByRole("button", { name: "К первому слайду" }).click();
  await expect(page).toHaveURL(new RegExp("scene=meno-question$"));
  await expect(continueLesson).toBeVisible();
  await continueLesson.click();
  await expect(scene.getByText("Назвать примеры", { exact: false })).toBeVisible();
  await expect(scene.getByRole("button", { name: "Завершить урок" })).toHaveCount(0);
  await expect(scene.getByRole("button", { name: "Продолжить урок" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sophia.lesson-completions.v1"))).toBeNull();
  await scene.getByRole("button", { name: "Повторить сцену" }).click();
  await scene.getByRole("button", { name: "Посмотреть примеры" }).click();
  await expect(scene.getByRole("status")).toHaveText("Изучено: 0 из 3");
  await expect(socrates).toHaveCount(0);
  await scene.getByRole("button", { name: "Вернуться в каталог" }).click();
  await expect(page.getByTestId("philosopher-catalog")).toBeVisible();
});

for (const width of [390, 768, 1024, 1440]) {
  test(`${width}px mosaic is readable with reduced motion`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(secondUrl);
    const scene = page.getByTestId("virtue-gallery-scene");
    await scene.getByRole("button", { name: "Посмотреть примеры" }).click();
    await examineExamples(scene);
    await expect.poll(() => scene.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await scene.getByRole("button", { name: "Что скажет Сократ?" }).click();
    await scene.getByRole("button", { name: "Далее" }).click();
    await scene.getByRole("button", { name: "Открыть объяснение" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await scene.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    expect((await new AxeBuilder({ page }).include('[data-testid="virtue-gallery-scene"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await scene.screenshot({ path: info.outputPath(`mosaic-${width}.png`), scale: "css", style: ".site-header { visibility: hidden; }" });
  });
}
