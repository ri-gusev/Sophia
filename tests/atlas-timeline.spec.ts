import { expect, test } from "@playwright/test";

async function surfaceDetail(page: import("@playwright/test").Page) {
  const box = (await page.locator("canvas").boundingBox())!;
  // Southern surface: excludes the northern philosopher avatars and the controls overlay.
  return page.screenshot({ clip: { x: box.x + box.width * 0.4, y: box.y + box.height * 0.55, width: box.width * 0.2, height: box.height * 0.2 } });
}

test("timeline changes historical years without replacing the globe and opens philosopher groups", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/atlas");
  await expect(page.getByRole("status")).toHaveText("Глобус готов", { timeout: 30_000 });
  const timeline = page.getByRole("slider", { name: "Год на исторической шкале" });
  await expect(timeline).toBeVisible();
  await expect(page.getByTestId("selected-year")).toHaveText("400 г. до н. э.");
  const canvas = await page.locator("canvas").elementHandle();
  const initial = await surfaceDetail(page);
  await timeline.fill("-350");
  await expect(page.getByTestId("selected-year")).toHaveText("350 г. до н. э.");
  expect(await canvas!.evaluate(element => element.isConnected)).toBe(true);
  await expect.poll(async () => (await surfaceDetail(page)).equals(initial), { timeout: 10_000 }).toBe(true);
  const group = page.getByRole("button", { name: /Философы:.*Платон/ }).first();
  await expect(group).toBeVisible();
  await group.click();
  await expect.poll(async () => (await surfaceDetail(page)).equals(initial), { timeout: 10_000 }).toBe(true);
  await page.getByRole("button", { name: "Платон", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Карточка философа" })).toContainText("Платон");
  await page.getByRole("button", { name: "Закрыть карточку" }).click();
  await expect(page.getByRole("complementary", { name: "Карточка философа" })).toHaveCount(0);
  await timeline.fill("-1");
  await timeline.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("selected-year")).toHaveText("1 г. н. э.");
  await timeline.fill("269");
  await expect(page.getByTestId("selected-year")).toHaveText("270 г. н. э.");
  await expect(page.getByTestId("philosopher-count")).toHaveText("1 философ");
});

test("markers stay attached while rotating and are inaccessible behind Earth", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const textureRequests: string[] = [];
  page.on("request", request => { if (request.url().includes("/textures/earth/")) textureRequests.push(request.url()); });
  await page.goto("/atlas");
  await expect(page.getByRole("status")).toHaveText("Глобус готов", { timeout: 30_000 });
  const timeline = page.getByRole("slider");
  await timeline.fill("99");
  const marker = page.getByRole("button", { name: "Эпиктет", exact: true });
  await expect(marker).toBeVisible();
  const before = (await marker.boundingBox())!;
  const scene = page.getByRole("region", { name: "Интерактивный глобус", exact: true });
  await scene.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => Math.abs((await marker.boundingBox())!.x - before.x)).toBeGreaterThan(3);
  for (let i = 0; i < 23; i++) await page.keyboard.press("ArrowRight", { delay: 50 });
  await expect(marker).toBeHidden({ timeout: 10_000 });
  await page.getByRole("button", { name: "Исходный вид" }).click();
  await expect(marker).toBeVisible();
  const count = textureRequests.length;
  await timeline.fill("-650");
  await expect(page.getByTestId("philosopher-count")).toHaveText("0 философов");
  await expect(page.locator("[data-marker-ids]:visible")).toHaveCount(0);
  await timeline.fill("99");
  await expect(marker).toBeVisible();
  expect(textureRequests).toHaveLength(count);
  await marker.click();
  await expect(page.getByRole("complementary")).toContainText("Никополь");
  await timeline.fill("199");
  await expect(page.getByRole("complementary")).toHaveCount(0);
});

test("mouse scrubs the timeline, life boundaries update and every grouped philosopher is selectable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Physical mouse drag is desktop-specific");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/atlas");
  await expect(page.getByRole("status")).toHaveText("Глобус готов", { timeout: 30_000 });
  const timeline = page.getByRole("slider");
  await timeline.scrollIntoViewIfNeeded();
  const box = (await timeline.boundingBox())!;
  await page.mouse.move(box.x + box.width * 250 / 919, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 15 });
  await page.mouse.up();
  expect(Number(await timeline.inputValue())).toBeGreaterThan(0);
  const socrates = page.locator('[data-marker-ids*="socrates"]');
  await timeline.fill("-470");
  await expect(socrates).toHaveCount(0);
  await timeline.fill("-469");
  await expect(socrates).toBeVisible();
  await timeline.fill("-399");
  await expect(socrates).toBeVisible();
  await timeline.fill("-398");
  await expect(socrates).toHaveCount(0);
  await timeline.fill("-350");
  for (const name of ["Платон", "Аристотель", "Диоген Синопский"]) {
    await page.getByRole("button", { name: /Философы:.*Платон/ }).first().click();
    await page.getByRole("button", { name, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("complementary").getByRole("heading")).toHaveText(name);
    await expect(page.getByRole("button", { name: "Закрыть карточку" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("complementary")).toHaveCount(0);
  }
});
