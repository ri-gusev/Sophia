import { expect, test } from "@playwright/test";

const eras = ["Античность", "Средневековье", "Новое время", "Немецкая философия", "Современная философия"];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("course map exposes five eras with five accessible steps each", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Основной курс философии");
  const map = page.getByRole("region", { name: "Карта основного курса", exact: true });
  await expect(map).toBeVisible();
  await expect(map.getByTestId("course-step")).toHaveCount(25);
  for (const era of eras) {
    await expect(page.getByRole("button", { name: era, exact: true })).toBeVisible();
    await expect(map.getByRole("button", { name: new RegExp(`^${era}: шаг [1-5] — .+`) })).toHaveCount(5);
    for (let number = 1; number <= 5; number += 1) {
      await expect(map.getByRole("button", { name: new RegExp(`^${era}: шаг ${number} — .+`) })).toHaveCount(1);
    }
  }
});

test("steps open an honest preview dialog by keyboard and return focus on close", async ({ page }) => {
  await page.goto("/learn");
  const step = page.getByTestId("course-step").first();
  const label = await step.getAttribute("aria-label");
  expect(label).toMatch(/^Античность: шаг 1 — .+/);
  const title = label!.split(" — ")[1];
  await step.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: title, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(dialog).toContainText(/урок[^.!?]*(?:в разработке|недоступ)/i);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(step).toBeFocused();

  await page.keyboard.press("Enter");
  await dialog.getByRole("button", { name: "Вернуться к карте", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(step).toBeFocused();
});

test("viewing a demo leaves steps uncompleted and reload closes the dialog", async ({ page }) => {
  await page.goto("/learn");
  const steps = page.getByTestId("course-step");
  const originalLabels = await steps.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
  await steps.first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Вернуться к карте", exact: true }).click();
  await expect(steps).toHaveCount(25);
  expect(await steps.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")))).toEqual(originalLabels);
  await expect(page.getByRole("main")).not.toContainText(/пройдено\s*[:：]?\s*[1-9]|завершено\s*[:：]?\s*[1-9]/i);
  await steps.first().click();
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await steps.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")))).toEqual(originalLabels);
  await expect(page.getByRole("button", { name: eras[0], exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("era navigation scrolls the map and exposes the selected era", async ({ page }) => {
  await page.goto("/learn");
  const viewport = page.getByTestId("course-map-viewport");
  for (const era of eras) {
    await page.getByRole("button", { name: era, exact: true }).click();
    for (const candidate of eras) {
      await expect(page.getByRole("button", { name: candidate, exact: true })).toHaveAttribute("aria-pressed", String(candidate === era));
    }
    await expect(viewport.getByRole("button", { name: new RegExp(`^${era}: шаг 3 —`) })).toBeInViewport();
  }
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await page.getByRole("button", { name: eras[0], exact: true }).click();
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeLessThanOrEqual(1);
});

test("restored map keeps the reference scale and loads all era and transition images", async ({ page }) => {
  await page.goto("/learn");
  const viewport = page.getByTestId("course-map-viewport");
  const scene = viewport.getByTestId("course-map-scene");
  await expect(scene).toHaveCSS("width", "3800px");
  await expect(scene).toHaveCSS("height", "650px");
  const scenery = scene.getByTestId("course-map-scenery");
  const transitions = scene.getByTestId("course-map-transition");
  await expect(scenery).toHaveCount(5);
  await expect(transitions).toHaveCount(4);
  for (const era of eras) {
    await page.getByRole("button", { name: era, exact: true }).click();
  }
  for (const images of [scenery, transitions]) {
    await expect.poll(() => images.evaluateAll((nodes) => nodes.every((node) =>
      node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0,
    ))).toBe(true);
  }
});

test("horizontal wheel updates the active era after an era navigation click", async ({ page }) => {
  await page.goto("/learn");
  const antiquity = page.getByRole("button", { name: eras[0], exact: true });
  const viewport = page.getByTestId("course-map-viewport");
  await antiquity.click();
  await viewport.hover();
  await page.mouse.wheel(650, 0);
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await expect(antiquity).toHaveAttribute("aria-pressed", "false");
});

test("keyboard, mouse drag and wheel move the map horizontally", async ({ page }) => {
  await page.goto("/learn");
  const viewport = page.getByTestId("course-map-viewport");
  await viewport.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeLessThanOrEqual(1);

  const box = await viewport.boundingBox();
  expect(box).not.toBeNull();
  const startX = box!.x + box!.width * 0.75;
  const startY = box!.y + box!.height * 0.12;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 160, startY, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const beforeWheel = await viewport.evaluate((node) => node.scrollLeft);
  await viewport.hover();
  await page.mouse.wheel(0, 240);
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(beforeWheel);
});

test("the map scrolls inside its viewport without overflowing narrow or wide pages", async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/learn");
    await page.evaluate(() => document.fonts.ready);
    const viewport = page.getByTestId("course-map-viewport");
    await expect(viewport).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await viewport.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    await page.getByRole("button", { name: eras[4], exact: true }).click();
    await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
