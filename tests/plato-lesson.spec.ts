import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the first Plato lesson opens below the map and reload restores its current scene", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn");
  await page.locator('[data-node-id="plato"]').click();
  const catalog = page.getByRole("dialog", { name: "Платон", exact: true });
  await catalog.getByRole("button", { name: "Сократ и рождение философского вопроса", exact: true }).click();
  const firstTopic = catalog.getByRole("button", { name: "Кто такой Платон?", exact: true });
  await expect(firstTopic).toBeEnabled();
  const beforeScroll = await page.evaluate(() => scrollY);
  await firstTopic.focus();
  await page.keyboard.press("Enter");
  const lesson = page.getByTestId("lesson-introduction");
  await expect(lesson).toBeVisible();
  const artwork = lesson.getByTestId("lesson-artwork");
  await expect(artwork).toBeVisible();
  await expect.poll(() => artwork.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(lesson.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  await expect(lesson.getByRole("heading", { level: 2 })).not.toBeFocused();
  await expect(lesson).toContainText("Представь человека, жившего почти две с половиной тысячи лет назад.");
  await expect(lesson).toContainText("Его звали Платон.");
  const lessonBox = await lesson.boundingBox();
  const mapBox = await page.getByTestId("course-map-frame").boundingBox();
  expect(lessonBox!.y).toBeGreaterThan(mapBox!.y + mapBox!.height);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(beforeScroll);
  if (page.viewportSize()!.width >= 1000) {
    await expect(catalog).toBeVisible();
    const catalogBox = await catalog.boundingBox();
    expect(lessonBox!.y).toBeGreaterThan(catalogBox!.y + catalogBox!.height);
  } else {
    await expect(catalog).toHaveCount(0);
  }
  await expect(lesson.getByRole("button", { name: "Начать путешествие", exact: true })).toBeEnabled();
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="lesson-introduction"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await lesson.screenshot({ path: testInfo.outputPath("lesson-scene.png"), style: ".site-header,.skip-link { visibility:hidden !important; }" });
  await expect(page).toHaveURL(/\/learn#lesson=plato-introduction&scene=journey$/);
  await page.reload();
  await expect(lesson).toBeVisible();
  await expect(lesson.getByRole("heading", { level: 2 })).not.toBeFocused();
  await expect(lesson.getByRole("heading", { level: 2 })).toBeInViewport();
  await expect(lesson.getByRole("radio", { checked: true })).toHaveCount(0);
});

test("unknown lesson fragments safely leave the map available", async ({ page }) => {
  await page.goto("/learn#lesson=unknown");
  await expect(page.getByTestId("course-map-viewport")).toBeVisible();
  await expect(page.getByTestId("lesson-introduction")).toHaveCount(0);
});

test("lesson scene keeps text on a clear background and respects motion preferences", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/learn");
  await page.locator('[data-node-id="plato"]').click();
  await page.getByRole("button", { name: "Сократ и рождение философского вопроса", exact: true }).click();
  await page.getByRole("button", { name: "Кто такой Платон?", exact: true }).click();
  const scene = page.getByTestId("lesson-scene");
  const title = scene.getByRole("heading", { level: 2 });
  const animation = await title.evaluate(node => {
    const style = getComputedStyle(node);
    return { duration: parseFloat(style.animationDuration), name: style.animationName };
  });
  expect(animation.duration).toBeGreaterThanOrEqual(1);
  expect(animation.duration).toBeLessThanOrEqual(1.5);
  expect(animation.name).not.toBe("none");
  await expect.poll(() => title.evaluate(node => getComputedStyle(node).opacity)).toBe("1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await title.evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  const closeCatalog = page.getByRole("button", { name: "Закрыть каталог", exact: true });
  if (await closeCatalog.isVisible()) await closeCatalog.click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(scene).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const imageBox = await scene.getByTestId("lesson-artwork").boundingBox();
    const titleBox = await title.boundingBox();
    expect(titleBox!.x).toBeGreaterThan(imageBox!.x + imageBox!.width);
    expect(imageBox!.height).toBeLessThanOrEqual(104);
    expect(await title.evaluate(node => getComputedStyle(node.parentElement!).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await scene.evaluate(node => getComputedStyle(node).borderTopWidth)).toBe("0px");
    await scene.screenshot({ path: testInfo.outputPath(`scene-${width}.png`), style: ".site-header,.skip-link { visibility:hidden !important; }" });
  }
});
