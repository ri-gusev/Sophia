import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the first Plato topic opens an inline introduction below the map with three speculative answers", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn");
  await page.locator('[data-node-id="plato"]').click();
  const catalog = page.getByRole("dialog", { name: "Платон", exact: true });
  const firstTopic = catalog.getByRole("button", { name: "Кто такой Платон?", exact: true });
  await expect(firstTopic).toBeEnabled();
  await expect(catalog.getByRole("button", { name: /Что такое добродетель|Мир идей|Что значит знать|Душа и человек|Идеальное государство|Проблема бытия/ })).toHaveCount(6);
  const beforeScroll = await page.evaluate(() => scrollY);
  await firstTopic.focus();
  await page.keyboard.press("Enter");
  const lesson = page.getByRole("region", { name: "Философ, который мог стать поэтом", exact: true });
  await expect(lesson).toBeVisible();
  await expect(lesson.getByRole("heading", { level: 2 })).toBeFocused();
  await expect(lesson).toContainText("По легенде");
  await expect(lesson).toContainText("Но что такого мог сказать Сократ, чтобы изменить его жизнь?");
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
  await expect(lesson.getByRole("radio")).toHaveCount(3);
  await expect(lesson.getByRole("radio", { checked: true })).toHaveCount(0);
  await lesson.getByRole("radio").nth(1).check();
  await expect(lesson.getByRole("radio", { checked: true })).toHaveCount(1);
  await page.keyboard.press("ArrowDown");
  await expect(lesson.getByRole("radio").nth(2)).toBeChecked();
  await expect(lesson.getByRole("button", { name: /Продолжить|Далее/ })).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="lesson-introduction"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page).toHaveURL(/\/learn$/);
  await page.reload();
  await expect(page.getByTestId("lesson-introduction")).toHaveCount(0);
});
