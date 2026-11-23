import { expect, test } from "@playwright/test";

test("a rejected reset stays local to the tab and clears both stage and scroll", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const lessonId = "plato-virtue-definition";
  const url = `/learn#lesson=${lessonId}&scene=virtue-many-faces`;
  const base = `sophia.lesson-resume.v2:${lessonId}:scene:virtue-many-faces`;
  const stageKey = `${base}::field:stage`;
  const scrollKey = `${base}::scroll`;
  const otherKey = `sophia.lesson-resume.v2:${lessonId}:scene:meno-question::field:stage`;
  const credit = `sophia.lesson-progress.v2:slide:${lessonId}:virtue-many-faces`;
  await page.goto("/learn");
  await page.evaluate(({ stageKey, scrollKey, otherKey, credit }) => {
    localStorage.setItem(stageKey, JSON.stringify({ value: "gallery" }));
    localStorage.setItem(scrollKey, JSON.stringify({ value: 500 }));
    localStorage.setItem(otherKey, JSON.stringify({ value: 2 }));
    localStorage.setItem(credit, "1");
  }, { stageKey, scrollKey, otherKey, credit });
  await page.goto(url);
  const scene = page.getByTestId("virtue-gallery-scene");
  await expect(scene.getByRole("heading", { name: "Примеры Менона" })).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.addEventListener("test:restore-storage", () => { Storage.prototype.setItem = original; }, { once: true });
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "QuotaExceededError"); };
  });
  await scene.getByRole("button", { name: "К предыдущему", exact: true }).click();
  await expect(page.getByTestId("virtue-intro-scene")).toHaveAttribute("data-stage", "2");
  await page.evaluate(url => { location.hash = url.split("#")[1]; }, url);
  await expect(scene.getByRole("button", { name: "Посмотреть примеры" })).toBeVisible();
  await expect.poll(() => scene.getByTestId("lesson-scene-header").evaluate(el => {
    const inset = (document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0) + 24;
    return Math.abs(el.getBoundingClientRect().top - inset);
  })).toBeLessThan(2);

  const other = await context.newPage();
  await other.goto("/learn");
  await other.evaluate(key => localStorage.setItem(key, JSON.stringify({ value: "socrates" })), stageKey);
  await page.evaluate(() => window.dispatchEvent(new Event("test:restore-storage")));
  await page.getByRole("button", { name: "Закрыть урок" }).click();
  await expect(scene).toHaveCount(0);
  await page.evaluate(url => { location.hash = url.split("#")[1]; }, url);
  await expect(scene.getByRole("button", { name: "Посмотреть примеры" })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), `${base}:reset`)).toBeNull();
  await page.reload();
  await expect(scene.getByRole("heading", { name: "Сократ", exact: true })).toBeVisible();
  expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), [otherKey, credit]))
    .toEqual([JSON.stringify({ value: 2 }), "1"]);
});
