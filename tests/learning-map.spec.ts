import { expect, test } from "@playwright/test";

const eras = ["Античность", "Средневековье", "Новое время", "Немецкая философия", "Современная философия"];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("course map exposes five eras with four ancient main nodes and five in each later era", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Основной курс философии");
  const map = page.getByRole("region", { name: "Карта основного курса", exact: true });
  await expect(map).toBeVisible();
  await expect(map.getByTestId("course-step")).toHaveCount(25);
  for (const era of eras) {
    await expect(page.getByRole("button", { name: era, exact: true })).toBeVisible();
    const count = era === "Античность" ? 4 : 5;
    await expect(map.getByRole("button", { name: new RegExp(`^${era}: шаг [1-5] — .+`) })).toHaveCount(count);
    for (let number = 1; number <= count; number += 1) {
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
    await viewport.scrollIntoViewIfNeeded();
    for (const candidate of eras) {
      await expect(page.getByRole("button", { name: candidate, exact: true })).toHaveAttribute("aria-pressed", String(candidate === era));
    }
    await expect(viewport.getByRole("button", { name: new RegExp(`^${era}: шаг 1 —`) })).toBeInViewport();
  }
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await page.getByRole("button", { name: eras[0], exact: true }).click();
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeLessThanOrEqual(1);
});

test("detailed world uses one full-width era per frame and a sufficiently large source", async ({ page }) => {
  await page.goto("/learn");
  const viewport = page.getByTestId("course-map-viewport");
  const scene = viewport.getByTestId("course-map-scene");
  await expect(scene).toHaveCSS("width", "5900px");
  await expect(scene).toHaveCSS("height", "650px");
  const scenery = scene.getByTestId("course-map-scenery");
  const transitions = scene.getByTestId("course-map-transition");
  await expect(scenery).toHaveCount(5);
  await expect(transitions).toHaveCount(4);
  await expect(scene.getByTestId("course-branch-route")).toHaveCount(1);
  for (const era of eras) {
    await page.getByRole("button", { name: era, exact: true }).click();
  }
  await expect.poll(() => scenery.evaluateAll((nodes) => nodes.every(node =>
    node instanceof HTMLImageElement && node.complete && node.naturalWidth >= 1180 && node.naturalHeight >= 650,
  ))).toBe(true);
  await expect.poll(() => transitions.evaluateAll((nodes) => nodes.every(node =>
    node instanceof HTMLImageElement && node.complete && node.naturalWidth >= 400 && node.naturalHeight >= 650,
  ))).toBe(true);
  // Each era is at least as wide as the viewport, including on ultrawide monitors.
  expect(await viewport.evaluate(node => node.clientWidth)).toBeLessThanOrEqual(1180);
  const centers = await scene.locator('[data-node-type="main"]').evaluateAll((nodes) => nodes.map((node) => {
    const bounds = node.getBoundingClientRect();
    const world = node.closest('[data-testid="course-map-scene"]')!.getBoundingClientRect();
    return { eraId: node.getAttribute("data-era-id"), x: bounds.x + bounds.width / 2 - world.x, y: bounds.y + bounds.height / 2 - world.y };
  }));
  const eraIds = ["antiquity", "medieval", "early-modern", "german", "contemporary"];
  for (const { eraId, x, y } of centers) {
    const eraIndex = eraIds.indexOf(eraId!);
    expect(x).toBeGreaterThan(eraIndex * 1180 + 50);
    expect(x).toBeLessThan((eraIndex + 1) * 1180 - 50);
    expect(y).toBeGreaterThan(200);
    expect(y).toBeLessThan(450);
  }
});

test("wheel over the map scrolls the page and never moves the map", async ({ page }) => {
  await page.goto("/learn");
  const viewport = page.getByTestId("course-map-viewport");
  const box = await viewport.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 60);
  const beforeMap = await viewport.evaluate((node) => node.scrollLeft);
  const beforePage = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 240);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(beforePage);
  expect(await viewport.evaluate((node) => node.scrollLeft)).toBe(beforeMap);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 60);
  await page.mouse.wheel(650, 0);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await viewport.evaluate((node) => node.scrollLeft)).toBe(beforeMap);
});

test("keyboard, mouse drag and bottom scrollbar move the map horizontally", async ({ page }) => {
  await page.goto("/learn");
  const viewport = page.getByTestId("course-map-viewport");
  await viewport.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeLessThanOrEqual(1);

  await viewport.scrollIntoViewIfNeeded();
  const box = await viewport.boundingBox();
  expect(box).not.toBeNull();
  const startX = box!.x + box!.width * 0.75;
  // The new optional branch occupies the upper route area; drag clear background below it.
  const startY = box!.y + box!.height * 0.85;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 160, startY, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: eras[0], exact: true }).click();
  const scrollbar = page.getByRole("slider", { name: "Прокрутка карты", exact: true });
  await expect(scrollbar).toBeVisible();
  await scrollbar.scrollIntoViewIfNeeded();
  const scrollbarBox = await scrollbar.boundingBox();
  expect(scrollbarBox).not.toBeNull();
  await page.mouse.click(scrollbarBox!.x + scrollbarBox!.width * 0.8, scrollbarBox!.y + scrollbarBox!.height / 2);
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await scrollbar.press("End");
  await expect(viewport.getByTestId("course-step").last()).toBeInViewport();
  await scrollbar.press("Home");
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeLessThanOrEqual(1);
});

test("the map scrolls inside its viewport without overflowing narrow or wide pages", async ({ page }) => {
  for (const width of [320, 390, 1440, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/learn");
    await page.evaluate(() => document.fonts.ready);
    const viewport = page.getByTestId("course-map-viewport");
    await expect(viewport).toBeVisible();
    const frameBox = await page.getByTestId("course-map-frame").boundingBox();
    const mapBox = await viewport.boundingBox();
    const headerBox = await page.locator("header .container").boundingBox();
    const logoBox = await page.getByRole("link", { name: "Sophia — на главную", exact: true }).boundingBox();
    const scrollbarBox = await page.getByRole("slider", { name: "Прокрутка карты", exact: true }).boundingBox();
    expect(frameBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(logoBox).not.toBeNull();
    expect(scrollbarBox).not.toBeNull();
    const gaps = [mapBox!.x - frameBox!.x, mapBox!.y - frameBox!.y,
      frameBox!.x + frameBox!.width - mapBox!.x - mapBox!.width,
      frameBox!.y + frameBox!.height - scrollbarBox!.y - scrollbarBox!.height];
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(8);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(12);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(1);
    expect(Math.abs(frameBox!.x - logoBox!.x)).toBeLessThan(1);
    expect(Math.abs(frameBox!.width - headerBox!.width)).toBeLessThan(1);
    expect(mapBox!.height).toBeLessThanOrEqual(480);
    expect(scrollbarBox!.y - mapBox!.y - mapBox!.height).toBeGreaterThanOrEqual(0);
    expect(scrollbarBox!.y - mapBox!.y - mapBox!.height).toBeLessThanOrEqual(4);
    expect(Math.abs(scrollbarBox!.x - mapBox!.x)).toBeLessThan(1);
    expect(Math.abs(scrollbarBox!.width - mapBox!.width)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await viewport.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    expect(frameBox!.x).toBeCloseTo(width - frameBox!.x - frameBox!.width, 0);
    await page.getByRole("button", { name: eras[4], exact: true }).click();
    await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
