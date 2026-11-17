import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("mentor six turns, staged diagram, replay and previous dialogue", async ({ page }, info) => {
  await page.goto("/learn#lesson=plato-socratic-question&scene=socratic-questions");
  const scene = page.getByTestId("mentor-scene");
  await expect(scene).toBeVisible();
  await expect(scene.getByRole("status")).toContainText("Ты заметил");
  await expect(scene.getByRole("heading", { name: "Утверждение", exact: true })).toHaveCount(0);
  await scene.screenshot({ animations: "disabled", path: info.outputPath("initial.png"), style: ".site-header,.skip-link{visibility:hidden!important}" });
  for (let turn = 2; turn <= 6; turn++) {
    await page.waitForTimeout(450);
    await scene.getByRole("button", { name: "Далее", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(scene.getByRole("navigation", { name: "Реплики Сократа" })).toContainText(`${turn} / 6`);
    await expect(scene.getByRole("heading", { name: "Утверждение", exact: true })).toHaveCount(1);
    await expect(scene.getByRole("heading", { name: "Проверка", exact: true })).toHaveCount(turn >= 4 ? 1 : 0);
    await expect(scene.getByRole("heading", { name: "Вывод", exact: true })).toHaveCount(turn >= 5 ? 1 : 0);
    if (turn === 4) await scene.screenshot({ animations: "disabled", path: info.outputPath("fourth.png"), style: ".site-header,.skip-link{visibility:hidden!important}" });
  }
  await expect(scene.getByRole("heading", { name: "Главная мысль" })).toBeVisible();
  await scene.screenshot({ animations: "disabled", path: info.outputPath("final.png"), style: ".site-header,.skip-link{visibility:hidden!important}" });
  expect((await new AxeBuilder({ page }).include('[data-testid="mentor-scene"]').withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await scene.getByRole("button", { name: "Повторить объяснение" }).click();
  await expect(scene.getByRole("status")).toContainText("Ты заметил");
  await expect(scene.getByRole("heading", { name: "Главная мысль" })).toHaveCount(0);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await scene.screenshot({ animations: "disabled", path: info.outputPath(`${width}.png`), style: ".site-header,.skip-link{visibility:hidden!important}" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await scene.getByRole("status").evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  await scene.getByRole("button", { name: "К предыдущему слайду" }).click();
  const dialogue = page.getByTestId("dialogue-scene");
  for (let turn = 1; turn < 8; turn++) { await page.waitForTimeout(450); await dialogue.getByRole("button", { name: "Далее", exact: true }).click(); }
  await dialogue.getByRole("button", { name: "Разобрать разговор" }).click();
  await dialogue.getByRole("button", { name: "Продолжить урок" }).click();
  await scene.getByRole("button", { name: "К предыдущему слайду" }).click();
  await expect(dialogue.getByTestId("dialogue-counter")).toHaveText("8 / 8");
  await expect(dialogue.getByRole("button", { name: "Продолжить урок" })).toBeVisible();
});
