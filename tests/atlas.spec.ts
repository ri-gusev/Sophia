import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function loadedGlobe(page: Page) {
  await page.goto("/atlas");
  await expect(page.getByRole("status")).toHaveText("Глобус готов", { timeout: 30_000 });
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  return canvas;
}

async function stableGlobe(page: Page) {
  const canvas = page.locator("canvas");
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => {
    const bounds = element.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 1.5);
    return Math.abs(element.width - bounds.width * dpr) <= 1 && Math.abs(element.height - bounds.height * dpr) <= 1;
  })).toBe(true);
  let previous: Buffer | undefined;
  await expect.poll(async () => {
    const current = await canvas.screenshot();
    const stable = previous?.equals(current) ?? false;
    previous = current;
    return stable;
  }).toBe(true);
  return previous!;
}

test("atlas opens from the existing header and returns to the home page", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Открыть меню" });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole("link", { name: "Атлас", exact: true }).click();
  await expect(page).toHaveURL(/\/atlas$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Философский атлас");
  await page.getByRole("link", { name: "Вернуться на главную", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("real globe renders and mouse rotation and bounded zoom change its image", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Mouse interaction is checked in the desktop profile");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const canvas = await loadedGlobe(page);
  const initial = await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 130, box.y + box.height / 2 + 40, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => (await canvas.screenshot()).equals(initial)).toBe(false);
  // Screenshot comparisons exercise the rendered scene, without exposing camera internals.
  const rotated = await canvas.screenshot();
  await page.mouse.wheel(0, -600);
  await expect.poll(async () => (await canvas.screenshot()).equals(rotated)).toBe(false);
  await page.getByRole("button", { name: "Приблизить", exact: true }).click({ clickCount: 30 });
  await expect(page.getByRole("button", { name: "Приблизить", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Отдалить", exact: true }).click({ clickCount: 60 });
  await expect(page.getByRole("button", { name: "Отдалить", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Исходный вид" }).click();
  await expect(page.getByRole("button", { name: "Отдалить", exact: true })).toBeEnabled();
  await page.goto("/learn");
  await expect(page.getByRole("region", { name: "Карта основного курса", exact: true })).toBeVisible();
  await loadedGlobe(page);
  expect(errors).toEqual([]);
});

test("texture failure is explained and can be retried", async ({ page }) => {
  await page.route("**/textures/earth/earth-day.jpg", (route) => route.abort());
  await page.goto("/atlas");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Не удалось загрузить глобус");
  await page.unroute("**/textures/earth/earth-day.jpg");
  await page.getByRole("button", { name: "Попробовать снова" }).click();
  await expect(page.getByRole("status")).toHaveText("Глобус готов", { timeout: 30_000 });
});

test("unavailable WebGL has an accessible fallback and return link", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/atlas");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("WebGL");
  await expect(page.getByRole("link", { name: "Вернуться на главную", exact: true })).toBeVisible();
});

test("atlas fits narrow and landscape screens and has no detected accessibility violations", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loadedGlobe(page);
  for (const size of [{ width: 320, height: 740 }, { width: 667, height: 375 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Исходный вид" })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // R3F resizes its drawing buffer asynchronously after the browser viewport changes.
    await expect.poll(() => page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio, 1.5);
      return Math.abs(canvas.width - bounds.width * dpr) <= 1 && Math.abs(canvas.height - bounds.height * dpr) <= 1;
    })).toBe(true);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: testInfo.outputPath(`atlas-${size.width}x${size.height}.png`), fullPage: true });
  }
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
});

test("keyboard rotates the globe and context loss offers recovery", async ({ page }) => {
  const canvas = await loadedGlobe(page);
  const initial = await canvas.screenshot();
  const scene = page.getByRole("region", { name: "Интерактивный глобус", exact: true });
  await scene.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await canvas.screenshot()).equals(initial)).toBe(false);
  await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("WebGL");
  await page.getByRole("button", { name: "Попробовать снова" }).click();
  await expect(page.getByRole("status")).toHaveText("Глобус готов", { timeout: 30_000 });
});

test("reset clears rotation inertia", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  const canvas = await loadedGlobe(page);
  const initial = await stableGlobe(page);
  const scene = page.getByRole("region", { name: "Интерактивный глобус", exact: true });
  await scene.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Home");
  await expect.poll(async () => (await canvas.screenshot()).equals(initial)).toBe(true);
});

test("resize fits without replaying the previous zoom", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  const canvas = await loadedGlobe(page);
  const initial = await stableGlobe(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await stableGlobe(page);
  await page.getByRole("button", { name: "Приблизить", exact: true }).click();
  await page.setViewportSize({ width: 667, height: 375 });
  await stableGlobe(page);
  await expect.poll(async () => (await canvas.screenshot()).equals(initial)).toBe(true);
});

test("touch rotation and pinch zoom stay inside the globe area", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Touch gestures use the mobile profile");
  const canvas = await loadedGlobe(page);
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const session = await context.newCDPSession(page);
  const before = await canvas.screenshot();
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
  for (let step = 1; step <= 8; step++) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + step * 10, y, id: 1 }] });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);
  const rotated = await canvas.screenshot();
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x - 25, y, id: 1 }, { x: x + 25, y, id: 2 }] });
  for (let step = 1; step <= 6; step++) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 25 - step * 8, y, id: 1 }, { x: x + 25 + step * 8, y, id: 2 }] });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => (await canvas.screenshot()).equals(rotated)).toBe(false);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});
