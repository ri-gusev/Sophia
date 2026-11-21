import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { INTRO_LESSONS } from "../src/features/course-lesson/lesson-data";

const url = "/learn#lesson=plato-virtue-definition&scene=virtue-definition-practice";
const key = "sophia.lesson-completions.v1";
async function start(scene: Locator) {
  await scene.getByRole("button", { name: "Далее", exact: true }).click();
  await scene.getByRole("button", { name: "Начать исследование" }).click();
}
async function classify(scene: Locator, id: string, category: "example" | "definition") {
  const card = scene.locator(`[data-statement="${id}"]`);
  await card.focus(); await card.press("Enter");
  const bin = scene.getByRole("button", { name: category === "example" ? /^Конкретный пример/ : /^Попытка определения/ });
  await bin.focus(); await bin.press("Enter");
  await expect(card).toHaveAttribute("data-category", category);
}
async function sortAll(scene: Locator) {
  for (const [id, category] of [["money", "example"], ["rule", "definition"], ["mistake", "example"], ["character", "definition"]] as const) await classify(scene, id, category);
}
async function solveCases(scene: Locator) {
  await scene.getByRole("button", { name: "Проверить определение", exact: true }).click();
  await scene.getByRole("button", { name: "Определение может быть слишком узким", exact: true }).click();
  await scene.getByRole("button", { name: "Вторая ситуация" }).click();
  await scene.getByRole("button", { name: "Нет, нужно исследовать и то, как он использует власть", exact: true }).click();
}

test("exactly four of five planned slides remain unfinished", () => {
  const lesson = INTRO_LESSONS["plato-virtue-definition"];
  expect(lesson.plannedSlides).toBe(5);
  expect(lesson.scenes.map(scene => scene.id)).toEqual(["meno-question", "virtue-many-faces", "virtue-swarm", "virtue-definition-practice"]);
  expect(lesson.scenes.some(scene => ["completion", "lesson-reflection"].includes(scene.type))).toBe(false);
});

test("fourth slide opens as an unfinished philosophical workshop", async ({ page }) => {
  await page.goto(url);
  await expect(page.getByTestId("virtue-definition-practice-scene")).toBeVisible();
  await expect(page.getByText("Слайд 4 из 5")).toBeVisible();
});

test("third slide leads into the workshop, retries explain reasons and reload preserves the whole practice", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/learn#lesson=plato-virtue-definition&scene=virtue-swarm");
  const swarm = page.getByTestId("virtue-swarm-scene");
  await expect(swarm.getByRole("button", { name: "Продолжить урок" })).toHaveCount(0);
  for (let i = 0; i < 2; i++) await swarm.getByRole("button", { name: "Далее", exact: true }).click();
  await swarm.getByRole("button", { name: "Посмотреть на рой" }).click();
  await swarm.getByRole("button", { name: "Исследовать рой" }).click();
  await swarm.getByRole("button", { name: "Чем отличаются?", exact: true }).click();
  await swarm.getByRole("button", { name: "Что их объединяет?", exact: true }).click();
  await swarm.getByRole("button", { name: "А при чём здесь добродетель?" }).click();
  await swarm.getByRole("button", { name: "Далее", exact: true }).click();
  await swarm.getByRole("button", { name: "Попробовать самому" }).click();
  await swarm.getByRole("button", { name: "Что общего у всех добродетелей?" }).click();
  await swarm.getByRole("button", { name: "Открыть общую мысль" }).click();
  await expect(swarm.getByRole("button", { name: "Продолжить урок" })).toHaveCount(0);
  await swarm.getByRole("button", { name: "А добродетели?" }).click();
  await swarm.getByRole("button", { name: "Продолжить урок" }).click();
  const scene = page.getByTestId("virtue-definition-practice-scene");
  const shot = (name: string) => scene.screenshot({ path: info.outputPath(name), animations: "disabled", style: ".site-header,.skip-link { visibility:hidden!important; }" });
  await expect(scene.getByRole("heading", { level: 2 })).toHaveText("Пример или определение?");
  await expect(scene).toContainText("Мы уже увидели, что примеров добродетели может быть много");
  await shot("01-intro.png");
  await start(scene);
  await expect(scene.locator("[data-statement]")).toHaveCount(4);
  await expect(scene).toContainText("Попытка определения — ещё не правильное определение");
  await shot("02-statements.png");
  await scene.locator('[data-statement="money"]').click();
  await scene.getByRole("button", { name: /^Попытка определения/ }).click();
  await expect(scene.getByRole("status")).toContainText("Посмотри внимательнее");
  await expect(scene.getByRole("button", { name: "Проверить определение", exact: true })).toHaveCount(0);
  await classify(scene, "money", "example");
  await expect(scene.getByRole("status")).toContainText("конкретный поступок");
  await classify(scene, "rule", "definition");
  await expect(scene.getByRole("status")).toContainText("определение ещё предстоит проверить");
  await shot("03-partly-sorted.png");
  await page.reload();
  await expect(scene).toHaveAttribute("data-stage", "sort");
  await expect(scene.getByText("Распределено: 2 из 4")).toBeVisible();
  await expect(scene.getByRole("status")).toContainText("определение ещё предстоит проверить");
  await classify(scene, "mistake", "example");
  await classify(scene, "character", "definition");
  await expect(scene.locator('[data-category="example"]')).toHaveCount(2);
  await expect(scene.locator('[data-category="definition"]')).toHaveCount(2);
  await shot("04-classified.png");
  await scene.getByRole("button", { name: "Проверить определение", exact: true }).click();
  await expect(scene).toContainText("Ситуация 1 из 2");
  await expect(scene).toContainText("придуманные примеры");
  await shot("05-definition.png");
  await scene.getByRole("button", { name: "Значит, такой поступок никогда не бывает добродетельным", exact: true }).click();
  await expect(scene.getByRole("status")).toContainText("Подумай о границах определения");
  await expect(scene.getByRole("button", { name: "Вторая ситуация" })).toHaveCount(0);
  await page.reload();
  await expect(scene.getByRole("status")).toContainText("Подумай о границах определения");
  await scene.getByRole("button", { name: "Определение может быть слишком узким", exact: true }).click();
  await expect(scene.getByText("Требует проверки", { exact: true })).toBeVisible();
  await shot("06-without-power.png");
  await scene.getByRole("button", { name: "Вторая ситуация" }).click();
  await scene.getByRole("button", { name: "Да, любой правитель добродетелен", exact: true }).click();
  await expect(scene.getByRole("status")).toContainText("как человек распоряжается властью");
  await expect(scene.getByRole("button", { name: "Подвести итог" })).toHaveCount(0);
  await scene.getByRole("button", { name: "Нет, нужно исследовать и то, как он использует власть", exact: true }).click();
  await expect(scene).toContainText("Хорошее определение должно выдерживать проверку разными случаями");
  await shot("07-unjust-power.png");
  await page.reload();
  await expect(scene).toContainText("Ситуация 2 из 2");
  await expect(scene.getByRole("button", { name: "Подвести итог" })).toBeVisible();
  await scene.getByRole("button", { name: "Подвести итог" }).click();
  await scene.getByRole("button", { name: "Далее", exact: true }).click();
  await expect(scene.getByRole("list", { name: "Пример, определение, проверка" }).getByRole("listitem")).toHaveCount(3);
  await shot("08-final-schema.png");
  await scene.getByRole("button", { name: "К третьему слайду" }).click();
  await expect(swarm.getByText("Мысль урока · Sophia")).toBeVisible();
  await swarm.getByRole("button", { name: "Продолжить урок" }).click();
  await expect(scene.getByText("Мысль урока · Sophia")).toBeVisible();
  await page.reload();
  await expect(scene.getByText("Мысль урока · Sophia")).toBeVisible();
  await expect(page.locator("h2:focus, h3:focus")).toHaveCount(0);
  await expect(page.getByText("Слайд 4 из 5")).toBeVisible();
  await expect(scene.getByRole("button", { name: /Завершить урок|Продолжить урок/ })).toHaveCount(0);
  await expect(page.getByRole("progressbar", { name: "Прогресс урока" })).toHaveCount(0);
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
  await scene.getByRole("button", { name: "Повторить практику" }).click();
  await page.reload();
  await expect(scene).toHaveAttribute("data-stage", "intro");
  await start(scene);
  await expect(scene.getByText("Распределено: 0 из 4")).toBeVisible();
  await sortAll(scene);
  await scene.getByRole("button", { name: "Проверить определение", exact: true }).click();
  await expect(scene.getByRole("status")).toHaveCount(0);
  await expect(scene.getByText("Требует проверки", { exact: true })).toHaveCount(0);
  await scene.getByRole("button", { name: "Вернуться в каталог" }).click();
  await expect(page.getByTestId("philosopher-catalog")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [390, 768, 1024, 1440]) test(`workshop ${width}px remains accessible without motion`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  const scene = page.getByTestId("virtue-definition-practice-scene");
  async function inspect(name: string) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await scene.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    expect((await new AxeBuilder({ page }).include('[data-testid="virtue-definition-practice-scene"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await scene.screenshot({ path: info.outputPath(`${width}-${name}.png`), style: ".site-header,.skip-link { visibility:hidden!important; }" });
  }
  await inspect("intro"); await start(scene); await inspect("statements");
  await sortAll(scene); await inspect("classified"); await solveCases(scene); await inspect("tested");
  await scene.getByRole("button", { name: "Подвести итог" }).click();
  await scene.getByRole("button", { name: "Далее", exact: true }).click();
  await inspect("final");
});
