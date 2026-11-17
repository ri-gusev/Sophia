import { test, expect } from "@playwright/test";

import AxeBuilder from "@axe-core/playwright";

test("Socratic dialogue has eight turns, back, explanation and replay", async ({ page }, info) => {
  await page.goto("/learn");
  await page.locator('[data-node-id="plato"]').click();
  await page.getByRole("button", { name: "Сократ и рождение философского вопроса", exact: true }).click();
  await page.getByRole("button", { name: "Как Сократ разрушал уверенность?", exact: true }).click();
  const scene = page.getByTestId("dialogue-scene");
  await expect(scene).toBeVisible();
  await expect(scene).toContainText("Знаешь, Сократ");
  await expect(scene.getByRole("button", { name: "Предыдущая реплика" })).toBeDisabled();
  await scene.getByRole("button", { name: "Далее", exact: true }).click();
  await expect(scene).toContainText("Значит, ты считаешь");
  await scene.getByRole("button", { name: "Предыдущая реплика" }).click();
  await expect(scene).toContainText("Знаешь, Сократ");
  for (let i = 1; i < 8; i++) {
    await page.waitForTimeout(450);
    await scene.getByRole("button", { name: "Далее", exact: true }).click();
    await expect(scene.getByTestId("dialogue-counter")).toHaveText(`${i + 1} / 8`);
  }
  await expect(scene).toContainText("Так всегда ли справедливо");
  await expect(scene.getByRole("heading", { name: "Добро пожаловать в мир философии!" })).toBeVisible();
  await expect(scene).toContainText("не являются дословным переводом");
  await scene.screenshot({ path: info.outputPath("dialogue-complete.png") });
  await scene.getByRole("button", { name: "Повторить диалог" }).click();
  await expect(scene.getByTestId("dialogue-counter")).toHaveText("1 / 8");
  await expect(scene.getByRole("heading", { name: "Добро пожаловать в мир философии!" })).toHaveCount(0);
  await page.waitForTimeout(500);
  for (const image of await scene.locator("img").all()) expect(await image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await scene.screenshot({ path: info.outputPath("dialogue-desktop.png"), style: ".site-header,.skip-link { visibility:hidden !important; }" });
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="dialogue-scene"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await scene.getByRole("status").evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
