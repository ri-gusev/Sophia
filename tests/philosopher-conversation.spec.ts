import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const route of ["/", "/learn"]) {
  test(`conversation opens from ${route}, switches philosophers and keeps an unsent Plato draft`, async ({ page }) => {
    const sentRequests: string[] = [];
    page.on("request", request => {
      if (request.method() === "POST" || /api\.openai\.com|\/api\//.test(request.url())) sentRequests.push(request.url());
    });
    await page.goto(route);
    if (route === "/learn") await page.getByTestId("course-map-viewport").evaluate(node => { node.scrollLeft = 120; });
    const trigger = page.getByRole("button", { name: "Разговор с философом", exact: true });
    await trigger.focus();
    const originalScrollY = await page.evaluate(() => scrollY);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Разговор с философом", exact: true });
    await expect(dialog).toBeVisible();
    const plato = dialog.getByRole("button", { name: /^Платон/ });
    const aristotle = dialog.getByRole("button", { name: /^Аристотель/ });
    const marcus = dialog.getByRole("button", { name: /^Марк Аврелий/ });
    await expect(plato).toHaveAttribute("aria-pressed", "true");
    const composer = dialog.getByRole("textbox", { name: "Сообщение", exact: true });
    await expect(composer).toBeEnabled();
    await composer.fill("Мой вопрос о добродетели");
    await expect(dialog.getByRole("button", { name: "Отправить сообщение" })).toBeEnabled();
    await aristotle.click();
    await expect(aristotle).toHaveAttribute("aria-pressed", "true");
    await expect(composer).toBeDisabled();
    await expect(composer).toHaveValue("");
    await expect(dialog.getByRole("heading", { name: "Аристотель", exact: true })).toBeVisible();
    await marcus.click();
    await expect(marcus).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("heading", { name: "Марк Аврелий", exact: true })).toBeVisible();
    await plato.click();
    await expect(composer).toHaveValue("Мой вопрос о добродетели");
    for (const image of await dialog.locator("img").all()) {
      await expect.poll(() => image.evaluate(node => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0)).toBe(true);
    }
    await composer.focus();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(originalScrollY, 0);
    if (route === "/learn") expect(await page.getByTestId("course-map-viewport").evaluate(node => node.scrollLeft)).toBe(120);
    await expect(page).toHaveURL(route === "/" ? /\/$/ : /\/learn$/);
    expect(sentRequests).toEqual([]);
    await page.reload();
    await trigger.click();
    await expect(composer).toHaveValue("");
    await dialog.getByRole("button", { name: "Закрыть разговор" }).click();
    await expect(trigger).toBeFocused();
  });
}

test("conversation fits narrow screens, contains keyboard focus and passes accessibility checks", async ({ page }, testInfo) => {
  await page.goto("/learn");
  const trigger = page.getByRole("button", { name: "Разговор с философом", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Разговор с философом", exact: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  }
  await dialog.getByRole("button", { name: "Закрыть разговор" }).focus();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Закрыть разговор" })).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="philosopher-conversation"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.setViewportSize({ width: testInfo.project.name === "mobile" ? 390 : 1440, height: 900 });
  await page.screenshot({ path: testInfo.outputPath("conversation.png") });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("short landscape keeps the composer reachable by wheel and closing available", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto("/learn");
  const trigger = page.getByRole("button", { name: "Разговор с философом", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Разговор с философом", exact: true });
  await dialog.locator("header").first().hover();
  await page.mouse.wheel(0, 1000);
  await expect(dialog.getByText("Разговор хранится только в этой вкладке. После перезагрузки он исчезнет.", { exact: true })).toBeInViewport();
  await expect(dialog.getByRole("textbox", { name: "Сообщение", exact: true })).toBeInViewport();
  const close = dialog.getByRole("button", { name: "Закрыть разговор" });
  await expect(close).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("conversation-landscape.png") });
  await close.click();
  await expect(trigger).toBeFocused();
});
