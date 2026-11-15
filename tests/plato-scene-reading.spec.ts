import { expect, test } from "@playwright/test";

test("scene changes align a compact illustrated header above the plain reading area", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn#lesson=plato-introduction&scene=journey");
  const lesson = page.getByTestId("lesson-introduction");
  const heading = lesson.getByRole("heading", { level: 2 });
  async function expectReadingStart() {
    await expect(heading).toBeFocused();
    await expect.poll(async () => {
      const title = await lesson.getByTestId("lesson-scene-header").boundingBox();
      const header = await page.locator(".site-header").boundingBox();
      return Math.round(title!.y - (header!.y + header!.height));
    }).toBeGreaterThanOrEqual(12);
    await expect.poll(async () => {
      const title = await lesson.getByTestId("lesson-scene-header").boundingBox();
      const header = await page.locator(".site-header").boundingBox();
      return Math.round(title!.y - (header!.y + header!.height));
    }).toBeLessThanOrEqual(32);
  }
  await expectReadingStart();
  await lesson.getByRole("button", { name: "Начать путешествие", exact: true }).click();
  await expect(heading).toHaveText("Афины, V век до н. э.");
  await expectReadingStart();
  await lesson.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(heading).toHaveText("Философ, который мог стать поэтом");
  await expectReadingStart();
  await page.reload();
  await expectReadingStart();
  const scene = lesson.getByTestId("lesson-scene");
  const artwork = lesson.getByTestId("lesson-artwork");
  await expect(artwork).toHaveCSS("object-fit", "cover");
  const imageBox = await artwork.boundingBox(), titleBox = await heading.boundingBox();
  expect(imageBox!.height).toBeLessThanOrEqual(104);
  expect(titleBox!.x).toBeGreaterThan(imageBox!.x + imageBox!.width);
  const body = lesson.getByText("Согласно древнему преданию, в юности Платон увлекался поэзией и писал трагедии.", { exact: true });
  expect((await body.boundingBox())!.y).toBeGreaterThan(imageBox!.y + imageBox!.height);
  await expect.poll(() => artwork.evaluate(node => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0)).toBe(true);
  await expect.poll(() => artwork.evaluate(node => getComputedStyle(node.parentElement!).opacity)).toBe("1");
  await scene.screenshot({ path: testInfo.outputPath("compact-scene-header.png"), style: ".site-header,.skip-link { visibility:hidden !important; }" });
});
