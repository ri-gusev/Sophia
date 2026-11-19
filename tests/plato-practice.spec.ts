import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("practice retry, discovery, navigation and responsive composition", async ({ page }, info) => {
  await page.goto("/learn#lesson=plato-socratic-question&scene=socratic-questions");
  const mentor = page.getByTestId("mentor-scene");
  for (let i = 1; i < 6; i++) { await page.waitForTimeout(450); await mentor.getByRole("button", { name: "Далее", exact: true }).click(); }
  await mentor.getByRole("button", { name: "Продолжить урок" }).click();
  const scene = page.getByTestId("practice-scene");
  await expect(scene).toBeVisible();
  await expect(scene.getByRole("radio")).toHaveCount(0);
  for (let i = 1; i < 3; i++) { await page.waitForTimeout(450); await scene.getByRole("button", { name: "Далее", exact: true }).click(); }
  await expect(scene.getByRole("button", { name: "Проверить", exact: true })).toBeDisabled();
  await scene.screenshot({ animations: "disabled", path: info.outputPath("before-answer.png"), style: ".site-header,.skip-link{visibility:hidden!important}" });
  await scene.getByRole("radio", { name: "Да. Если человек умный, он не должен ошибаться" }).check();
  await scene.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(scene).toContainText("Подумай ещё");
  await expect(scene.getByRole("heading", { name: "Даже умный человек может ошибаться." })).toHaveCount(0);
  await scene.getByRole("radio", { name: "Нет. Даже умный человек иногда ошибается" }).check();
  await scene.getByRole("button", { name: "Проверить", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(scene).toContainText("Мы нашли случай, в котором правило не работает. Значит, утверждение со словом „никогда“ оказалось неверным");
  await expect(scene.getByRole("heading", { name: "Даже умный человек может ошибаться." })).toBeVisible();
  await scene.screenshot({ animations: "disabled", path: info.outputPath("correct-answer.png"), style: ".site-header,.skip-link{visibility:hidden!important}" });
  expect((await new AxeBuilder({ page }).include('[data-testid="practice-scene"]').withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await scene.getByRole("button", { name: "К предыдущему слайду" }).click();
  await expect(mentor.getByRole("button", { name: "Продолжить урок" })).toBeVisible();
  await mentor.getByRole("button", { name: "Продолжить урок" }).click();
  await expect(scene).toContainText("Мы нашли случай, в котором правило не работает");
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height:1000 });
    await scene.screenshot({ animations: "disabled", path:info.outputPath(`${width}-correct.png`), style: ".site-header,.skip-link{visibility:hidden!important}" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await scene.getByRole("button", { name: "Повторить задание" }).click();
  await expect(scene.getByRole("radio")).toHaveCount(0);
  await expect(scene.getByRole("status")).toContainText("Теперь попробуем вместе");
});
