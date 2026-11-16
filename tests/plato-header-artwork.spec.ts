import { expect, test } from "@playwright/test";

test("all eight scene headers load purpose-composed panoramic artwork", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const id of ["journey", "athens", "poet", "socrates", "trial", "academy", "legacy", "completion"]) {
    await page.goto(`/learn#lesson=plato-introduction&scene=${id}`);
    const scene = page.getByTestId("lesson-scene");
    await expect(scene).toHaveAttribute("data-scene-id", id);
    const image = scene.getByTestId("lesson-artwork");
    await expect(image).toHaveAttribute("src", /headers-v2/);
    await expect.poll(() => image.evaluate(node => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0)).toBe(true);
    const ratio = await image.evaluate(node => (node as HTMLImageElement).naturalWidth / (node as HTMLImageElement).naturalHeight);
    expect(ratio).toBeGreaterThanOrEqual(2.8);
    await expect.poll(() => image.evaluate(node => getComputedStyle(node.parentElement!).opacity)).toBe("1");
    if (page.viewportSize()!.width > 760) await expect(image).toHaveCSS("object-fit", "contain");
    await image.screenshot({ path: testInfo.outputPath(`${id}-artwork.png`) });
    await scene.getByTestId("lesson-scene-header").screenshot({ path: testInfo.outputPath(`${id}.png`) });
  }
});
