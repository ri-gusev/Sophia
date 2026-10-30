import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("quiz explains wrong and correct answers and resets without persistence", async ({ page }) => {
  await page.goto("/#exercise");
  const quiz = page.getByRole("region", { name: "Попробуем мыслить вместе?" });
  await quiz.getByRole("button", { name: /Платон/ }).click();
  await expect(quiz.getByRole("status")).toContainText("Не совсем");
  await expect(quiz.getByRole("status")).toContainText("Рене Декарт");
  await expect(quiz.getByRole("button", { name: /Платон/ })).toBeDisabled();
  await quiz.getByRole("button", { name: "Попробовать ещё раз" }).click();
  await expect(quiz.getByRole("button", { name: /Платон/ })).toBeFocused();
  await quiz.getByRole("button", { name: /Рене Декарт/ }).focus();
  await page.keyboard.press("Enter");
  await expect(quiz.getByRole("status")).toContainText("Верно!");
  await page.reload();
  await expect(quiz.getByRole("button", { name: /Рене Декарт/ })).toBeEnabled();
  await expect(quiz.getByRole("status")).toBeEmpty();
});

test("navigation and CTAs target real sections, login is unavailable", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    const toggle = page.getByRole("button", { name: /^(Открыть|Закрыть) меню$/ });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", { name: "Атлас", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
  await page.getByRole("link", { name: "Начать обучение" }).click();
  await expect(page).toHaveURL(/#exercise$/);
  await expect(page.getByRole("heading", { name: "Попробуем мыслить вместе?" })).toBeInViewport();
  const links = await page.locator('a[href^="#"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  for (const link of links) {
    expect(link).not.toBe("#");
    await expect(page.locator(link!)).toHaveCount(1);
  }
  await expect(page.getByRole("button", { name: /Войти/, includeHidden: true }).first()).toBeDisabled();
});

test("layout stays within viewport and remains readable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("page has no detectable serious accessibility violations", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: /Рене Декарт/ }).click();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});
