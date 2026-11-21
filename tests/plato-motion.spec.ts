import { expect, test, type Page } from "@playwright/test";

test.use({ video: "on", reducedMotion: "no-preference" });
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
});
test.afterEach(async ({ page }) => { expect(browserErrors.get(page)).toEqual([]); });

async function openScene(page: Page, id: string, fields: Record<string, unknown>) {
  await page.addInitScript(({ id, fields }) => {
    const key = "sophia.lesson-resume.v1:plato-virtue-definition";
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, scenes: { [id]: fields } }));
  }, { id, fields });
  await page.goto(`/learn#lesson=plato-virtue-definition&scene=${id}`);
}

test("opening explanation does not cancel a mosaic still in flight", async ({ page }) => {
  await openScene(page, "virtue-many-faces", { stage: "socrates", visited: ["city", "home", "ages"] });
  const scene = page.getByTestId("virtue-gallery-scene");
  await scene.getByRole("button", { name: "Далее", exact: true }).click();
  const tile = scene.locator("[data-virtue-tile]").first();
  await tile.evaluate(element => { for (const animation of element.getAnimations()) if (!(animation instanceof CSSAnimation)) animation.pause(); });
  await scene.getByRole("button", { name: "Открыть объяснение" }).click();
  expect(await tile.evaluate(element => element.getAnimations().some(animation => !(animation instanceof CSSAnimation)))).toBe(true);
});

test("changing swarm modes preserves flight timing and phase", async ({ page }) => {
  await openScene(page, "virtue-swarm", { stage: "explore" });
  const scene = page.getByTestId("virtue-swarm-scene");
  const flight = scene.locator('[data-bee="0"] svg').locator("..");
  const duration = await flight.evaluate(element => element.getAnimations()[0].effect!.getTiming().duration);
  await flight.evaluate(element => { const animation = element.getAnimations()[0]; animation.pause(); animation.currentTime = 6000; });
  await scene.getByRole("button", { name: "Чем отличаются?", exact: true }).click();
  expect(await flight.evaluate(element => element.getAnimations()[0].effect!.getTiming().duration)).toBe(duration);
  expect(await flight.evaluate(element => element.getAnimations()[0].currentTime)).toBe(6000);
  await scene.getByRole("button", { name: "Что их объединяет?", exact: true }).click();
  expect(await flight.evaluate(element => element.getAnimations()[0].effect!.getTiming().duration)).toBe(duration);
  expect(await flight.evaluate(element => element.getAnimations()[0].currentTime)).toBe(6000);
});

for (const width of [390, 768, 1024, 1440]) test(`motion continuity and rapid actions ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await openScene(page, "virtue-definition-practice", { stage: "sort" });
  const scene = page.getByTestId("virtue-definition-practice-scene");
  const tablet = scene.locator('[data-statement="money"]');
  await expect(tablet).toBeVisible();
  await page.waitForTimeout(650); // let the initial stagger finish before measuring FLIP
  await tablet.click();
  await scene.getByRole("button", { name: /^Конкретный пример/ }).click();
  // Freeze a real intermediate frame and inspect the end: the same DOM card
  // must settle to the underlying Grid rectangle, with no fill-mode jump.
  const settling = await tablet.evaluate(element => {
    const animation = element.getAnimations().find(item => !(item instanceof CSSAnimation));
    if (!animation) throw new Error("FLIP animation missing");
    animation.pause(); animation.currentTime = 280;
    const middle = element.getBoundingClientRect().toJSON();
    const duration = Number(animation.effect!.getTiming().duration);
    animation.currentTime = duration - .01;
    const last = element.getBoundingClientRect();
    animation.finish();
    const end = element.getBoundingClientRect();
    return { middle, last: last.toJSON(), end: end.toJSON() };
  });
  expect(Math.abs(settling.last.x - settling.end.x)).toBeLessThan(.2);
  expect(Math.abs(settling.last.y - settling.end.y)).toBeLessThan(.2);
  expect(Math.abs(settling.last.width - settling.end.width)).toBeLessThan(.2);
  // Interrupt the next sort without waiting for its animation.
  await scene.locator('[data-statement="rule"]').evaluate(element => (element as HTMLButtonElement).click());
  await scene.getByRole("button", { name: /^Попытка определения/ }).evaluate(element => (element as HTMLButtonElement).click());
  await scene.locator('[data-statement="mistake"]').evaluate(element => (element as HTMLButtonElement).click());
  await scene.getByRole("button", { name: /^Конкретный пример/ }).evaluate(element => (element as HTMLButtonElement).click());
  await page.waitForTimeout(700);
  await expect(scene.getByText("Распределено: 3 из 4")).toBeVisible();
  expect(await scene.locator("[data-statement]").evaluateAll(elements => elements.every(element => {
    const transform = getComputedStyle(element).transform;
    return transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)";
  }))).toBe(true);
  await scene.locator('[data-statement="character"]').click();
  await scene.getByRole("button", { name: /^Попытка определения/ }).click();
  await scene.getByRole("button", { name: "К предыдущему" }).click();
  expect(await scene.locator("[data-statement]").evaluateAll(elements => elements.every(element => element.getAnimations().length === 0))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.locator("h2:focus, h3:focus")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath(`${width}-after-interruption.png`) });
});

test("record bee flight, fades and repeated mode changes without resetting the cycle", async ({ page }) => {
  await openScene(page, "virtue-swarm", { stage: "explore" });
  const scene = page.getByTestId("virtue-swarm-scene");
  await scene.getByTestId("swarm-garden").scrollIntoViewIfNeeded();
  await page.waitForTimeout(2600);
  await scene.getByRole("button", { name: "Чем отличаются?", exact: true }).evaluate(element => (element as HTMLButtonElement).click());
  await page.waitForTimeout(650);
  await scene.getByRole("button", { name: "Что их объединяет?", exact: true }).evaluate(element => (element as HTMLButtonElement).click());
  await page.waitForTimeout(650);
  for (let i = 0; i < 4; i++) {
    await scene.getByRole("button", { name: i % 2 ? "Что их объединяет?" : "Чем отличаются?", exact: true }).evaluate(element => (element as HTMLButtonElement).click());
  }
  await expect(scene.getByRole("status")).toHaveText("Исследовано: 2 из 2 способов");
  const delta = await scene.locator('[data-bee="0"] svg').locator("..").evaluate(element => {
    const animation = element.getAnimations()[0]; animation.pause();
    const timing = animation.effect!.getTiming();
    animation.currentTime = Number(timing.delay) + Number(timing.duration) - .1;
    const end = new DOMMatrix(getComputedStyle(element).transform);
    animation.currentTime = Number(timing.delay) + Number(timing.duration) + .1;
    const start = new DOMMatrix(getComputedStyle(element).transform);
    return Math.max(Math.abs(end.a - start.a), Math.abs(end.b - start.b), Math.abs(end.e - start.e), Math.abs(end.f - start.f));
  });
  expect(delta).toBeLessThan(.01);
});

test("gallery explanations animate both opening and closing to zero", async ({ page }) => {
  await openScene(page, "virtue-many-faces", { stage: "gallery" });
  const scene = page.getByTestId("virtue-gallery-scene");
  const card = scene.getByRole("button", { name: /^Управлять городом/ });
  await card.click();
  await page.waitForTimeout(500);
  const region = scene.locator('[data-virtue-tile="city"] [data-motion-region]');
  const expanded = (await region.boundingBox())!.height;
  expect(expanded).toBeGreaterThan(20);
  await card.evaluate(element => (element as HTMLButtonElement).click());
  await expect.poll(() => region.evaluate(element => element.getAnimations().length)).toBeGreaterThan(0);
  const start = (await region.boundingBox())!.height;
  expect(start).toBeGreaterThan(0);
  await expect.poll(async () => (await region.boundingBox())!.height).toBeLessThan(1);
});

test("case transition retains the definition anchor and does not add a second scroll", async ({ page }) => {
  await openScene(page, "virtue-definition-practice", { stage: "test", answers: { "without-power": "narrow" } });
  const scene = page.getByTestId("virtue-definition-practice-scene");
  const definition = scene.getByRole("heading", { name: "Добродетель — способность управлять другими", exact: true });
  const before = (await definition.boundingBox())!.y;
  await scene.getByRole("button", { name: "Вторая ситуация" }).evaluate(element => (element as HTMLButtonElement).click());
  await page.waitForTimeout(600);
  expect(Math.abs((await definition.boundingBox())!.y - before)).toBeLessThan(2);
  await expect(scene).toContainText("Ситуация 2 из 2");
});

test("reduced motion cancels a live sort and tab switching leaves no stale transform", async ({ page, context }) => {
  await openScene(page, "virtue-definition-practice", { stage: "sort" });
  const scene = page.getByTestId("virtue-definition-practice-scene");
  await scene.locator('[data-statement="money"]').click();
  await scene.getByRole("button", { name: /^Конкретный пример/ }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => scene.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  const other = await context.newPage();
  await other.goto("about:blank"); await other.bringToFront();
  await page.bringToFront(); await other.close();
  await expect(scene.getByText("Распределено: 1 из 4")).toBeVisible();
  expect(await scene.locator('[data-statement="money"]').evaluate(element => getComputedStyle(element).transform)).toBe("none");
});

test("record mosaic movement and explanation disclosure", async ({ page }) => {
  await openScene(page, "virtue-many-faces", { stage: "gallery", visited: ["city", "home", "ages"] });
  const scene = page.getByTestId("virtue-gallery-scene");
  await scene.getByRole("button", { name: /^Управлять городом/ }).click();
  await page.waitForTimeout(500);
  await scene.getByRole("button", { name: /^Заботиться о доме/ }).click();
  await page.waitForTimeout(500);
  await scene.getByRole("button", { name: "Что скажет Сократ?" }).click();
  await scene.getByRole("button", { name: "Далее", exact: true }).click();
  await page.waitForTimeout(900);
  await scene.getByRole("button", { name: "Открыть объяснение" }).click();
  await page.waitForTimeout(600);
  await expect(scene.getByRole("group", { name: "Объяснение" })).toBeVisible();
});

test("record tablet relocation, feedback and case transitions", async ({ page }) => {
  await openScene(page, "virtue-definition-practice", { stage: "sort" });
  const scene = page.getByTestId("virtue-definition-practice-scene");
  for (const [id, category] of [["money", /^Конкретный пример/], ["rule", /^Попытка определения/], ["mistake", /^Конкретный пример/], ["character", /^Попытка определения/]] as const) {
    await scene.locator(`[data-statement="${id}"]`).click();
    await scene.getByRole("button", { name: category }).click();
    await page.waitForTimeout(650);
  }
  await scene.getByRole("button", { name: "Проверить определение", exact: true }).click();
  await scene.getByRole("button", { name: "Определение может быть слишком узким", exact: true }).click();
  await page.waitForTimeout(550);
  await scene.getByRole("button", { name: "Вторая ситуация" }).click();
  await page.waitForTimeout(550);
  await scene.getByRole("button", { name: "Нет, нужно исследовать и то, как он использует власть", exact: true }).click();
  await page.waitForTimeout(550);
  await expect(scene.getByRole("button", { name: "Подвести итог" })).toBeVisible();
});

test("tablets have no second spatial animation competing with FLIP", async ({ page }) => {
  await openScene(page, "virtue-definition-practice", { stage: "sort" });
  const scene = page.getByTestId("virtue-definition-practice-scene");
  const tablet = scene.locator('[data-statement="money"]');
  expect(await tablet.evaluate(element => element.getAnimations().filter(animation => animation instanceof CSSAnimation).some(animation =>
    (animation.effect as KeyframeEffect).getKeyframes().some(frame => "translate" in frame || "scale" in frame || "transform" in frame)))).toBe(false);
});

test("Meno choices retain their layout footprint while retreating", async ({ page }) => {
  await openScene(page, "meno-question", { stage: 1, selected: "unknown" });
  const scene = page.getByTestId("virtue-intro-scene");
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  expect(await scene.locator('[data-retreat="true"]').evaluate(element => getComputedStyle(element).position)).not.toBe("absolute");
});

test("record Meno question handoff and the following explanation", async ({ page }) => {
  await openScene(page, "meno-question", { stage: 1, selected: "unknown" });
  const scene = page.getByTestId("virtue-intro-scene");
  await page.waitForTimeout(650);
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.waitForTimeout(850);
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.waitForTimeout(550);
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.waitForTimeout(550);
  await expect(scene).toHaveAttribute("data-stage", "4");
});
