import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openGame(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn#lesson=plato-introduction&scene=academy");
  const scene = page.getByTestId("lesson-scene");
  await expect(scene).toHaveAttribute("data-scene-id", "academy");
  const figures = scene.getByRole("list", { name: "Порядок философов" });
  await expect(figures.getByRole("button")).toHaveCount(3);
  for (const image of await figures.locator("img").all()) await image.evaluate(node => (node as HTMLImageElement).decode());
  return { scene, figures };
}

test("figures drag with mouse or touch, require checking and survive reload", async ({ page }, testInfo) => {
  const { scene, figures } = await openGame(page);
  await figures.scrollIntoViewIfNeeded();
  await figures.screenshot({ path: testInfo.outputPath("scattered-figures.png") });
  const first = await figures.getByRole("button", { name: "Аристотель: переместить", exact: true }).boundingBox();
  const last = await figures.locator('[data-order-slot="2"]').boundingBox();
  const start = { x: first!.x + first!.width / 2, y: first!.y + first!.height / 2 };
  const end = { x: last!.x + last!.width / 2, y: start.y };
  const scroll = await page.evaluate(() => scrollY);
  if (testInfo.project.name === "mobile") {
    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1 }] });
      for (let step = 1; step <= 8; step++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x + (end.x - start.x) * step / 8, y: start.y, id: 1 }] });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } finally { await cdp.detach(); }
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  }
  await expect(scene.getByTestId("ordering-item-name")).toHaveText(["Сократ", "Платон", "Аристотель"]);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  const next = scene.getByRole("button", { name: "Продолжить", exact: true });
  await expect(next).toBeDisabled();
  await scene.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(next).toBeEnabled();
  for (const figure of await figures.getByRole("button").all()) await expect(figure).toBeDisabled();
  await page.reload();
  await expect(scene.getByTestId("ordering-item-name")).toHaveText(["Сократ", "Платон", "Аристотель"]);
  await expect(scene.getByTestId("exercise-feedback")).toBeVisible();
  await expect(next).toBeEnabled();
});

test("selection and keyboard reorder figures, mistakes allow retry, game is accessible", async ({ page }, testInfo) => {
  const { scene, figures } = await openGame(page);
  const aristotle = figures.getByRole("button", { name: "Аристотель: переместить", exact: true });
  const plato = figures.getByRole("button", { name: "Платон: переместить", exact: true });
  if (testInfo.project.name === "mobile") {
    await aristotle.tap();
    await expect(aristotle).toHaveAttribute("aria-pressed", "true");
    await plato.tap();
  } else {
    await aristotle.click();
    await expect(aristotle).toHaveAttribute("aria-pressed", "true");
    await plato.click();
  }
  await expect(scene.getByTestId("ordering-item-name")).toHaveText(["Сократ", "Платон", "Аристотель"]);
  await aristotle.focus();
  await page.keyboard.press("ArrowLeft");
  await scene.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(scene.getByTestId("exercise-feedback")).toHaveText("Ответ неверный");
  await expect(scene.getByRole("button", { name: "Продолжить", exact: true })).toBeDisabled();
  await aristotle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(scene.getByTestId("exercise-feedback")).toHaveCount(0);
  const axe = await new AxeBuilder({ page }).include('[data-testid="lesson-scene"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations).toEqual([]);
  await scene.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(scene.getByRole("button", { name: "Продолжить", exact: true })).toBeEnabled();
});
