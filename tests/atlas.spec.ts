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
    const dpr = Math.min(devicePixelRatio, matchMedia("(pointer: coarse)").matches ? 1.5 : 2);
    return Math.abs(element.width - bounds.width * dpr) <= 1 && Math.abs(element.height - bounds.height * dpr) <= 1;
  })).toBe(true);
  let previous: Buffer | undefined;
  await expect.poll(async () => {
    const current = await canvas.screenshot();
    const stable = previous?.equals(current) ?? false;
    previous = current;
    return stable;
  }, { timeout: 10_000 }).toBe(true); // WebGL screenshots can each take seconds on the test GPU.
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
  await page.route("**/textures/earth/earth-day*.jpg", (route) => route.abort());
  await page.goto("/atlas");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Не удалось загрузить глобус");
  await page.unroute("**/textures/earth/earth-day*.jpg");
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
      const dpr = Math.min(devicePixelRatio, matchMedia("(pointer: coarse)").matches ? 1.5 : 2);
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

test("resize increases distance only when necessary and reset restores the fitted view", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  const canvas = await loadedGlobe(page);
  const initial = await stableGlobe(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await stableGlobe(page);
  await page.getByRole("button", { name: "Приблизить", exact: true }).click();
  await page.setViewportSize({ width: 667, height: 375 });
  await stableGlobe(page);
  expect((await canvas.screenshot()).equals(initial)).toBe(false);
  await page.getByRole("button", { name: "Исходный вид" }).click();
  // Controls overlay the transparent canvas; keep hover/focus out of the image comparison.
  await page.mouse.move(0, 0);
  await page.getByRole("region", { name: "Интерактивный глобус", exact: true }).focus();
  await expect.poll(async () => (await canvas.screenshot()).equals(initial)).toBe(true);
});

test("resize preserves the chosen direction and an already sufficient distance", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  const canvas = await loadedGlobe(page);
  const initial = await stableGlobe(page);
  const scene = page.getByRole("region", { name: "Интерактивный глобус", exact: true });
  await scene.focus();
  for (let index = 0; index < 7; index++) await page.keyboard.press("ArrowRight");
  const rotated = await stableGlobe(page);
  expect(rotated.equals(initial)).toBe(false);
  await page.setViewportSize({ width: 1400, height: 850 });
  await stableGlobe(page);
  await page.setViewportSize({ width: 1100, height: 850 });
  await stableGlobe(page);
  await expect.poll(async () => (await canvas.screenshot()).equals(rotated)).toBe(true);
});

test("desktop loads the detailed map and falls back when it cannot be fetched", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "8K targets desktop GPUs");
  const textures: string[] = [];
  page.on("request", request => { if (request.url().includes("/textures/earth/")) textures.push(request.url()); });
  await page.route("**/textures/earth/earth-day-8k.jpg", route => route.abort());
  await loadedGlobe(page);
  expect(textures.some(url => url.endsWith("earth-day-8k.jpg"))).toBe(true);
  expect(textures.some(url => url.endsWith("earth-day.jpg"))).toBe(true);
  await page.unroute("**/textures/earth/earth-day-8k.jpg");
  textures.length = 0;
  await loadedGlobe(page);
  expect(textures.some(url => url.endsWith("earth-day-8k.jpg"))).toBe(true);
  expect(textures.some(url => url.endsWith("earth-day.jpg"))).toBe(false);
});

test("limited texture capability uses only the 4K fallback", async ({ page }) => {
  await page.addInitScript(() => {
    const getParameter = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (parameter: number) {
      if (parameter === this.MAX_TEXTURE_SIZE) return 4096;
      return getParameter.call(this, parameter);
    };
  });
  const textures: string[] = [];
  page.on("request", request => { if (request.url().includes("/textures/earth/")) textures.push(request.url()); });
  await loadedGlobe(page);
  expect(textures.some(url => url.endsWith("earth-day.jpg"))).toBe(true);
  expect(textures.some(url => url.endsWith("earth-day-8k.jpg"))).toBe(false);
});

test("desktop HiDPI remains at DPR 2 after readiness, control and resize", async ({ browser, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop HiDPI profile");
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();
    const canvas = await loadedGlobe(page);
    const ratio = () => canvas.evaluate((element: HTMLCanvasElement) => element.width / element.getBoundingClientRect().width);
    await expect.poll(ratio).toBeCloseTo(2, 2);
    await page.getByRole("button", { name: "Приблизить", exact: true }).click();
    await page.setViewportSize({ width: 1280, height: 850 });
    await expect.poll(ratio).toBeCloseTo(2, 2);
  } finally { await context.close(); }
});

test("idle globe stops scheduling frames and reports no WebGL errors", async ({ page }) => {
  await page.addInitScript(() => {
    let frames = 0;
    const scheduleFrame = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => scheduleFrame(time => { frames++; callback(time); });
    Object.defineProperty(window, "__atlasFrames", { get: () => frames });
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await loadedGlobe(page);
  await stableGlobe(page);
  const frames = () => page.evaluate(() => (window as unknown as { __atlasFrames: number }).__atlasFrames);
  const before = await frames();
  await page.waitForTimeout(400);
  expect(await frames() - before).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
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
