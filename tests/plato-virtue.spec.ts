import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { INTRO_LESSONS } from "../src/features/course-lesson/lesson-data";
import { readLessonLocation } from "../src/features/course-lesson/lesson-state";

test("virtue lesson registers exactly four unfinished slides", () => {
  const location = readLessonLocation("#lesson=plato-virtue-definition&scene=meno-question");
  expect(location).toEqual({ lessonId: "plato-virtue-definition", sceneId: "meno-question" });
  const lesson = Object.values(INTRO_LESSONS).find(item => item.id === location?.lessonId);
  expect(lesson?.scenes.map(scene => scene.id)).toEqual(["meno-question", "virtue-many-faces", "virtue-swarm", "virtue-definition-practice"]);
  expect(readLessonLocation("#lesson=plato-virtue-definition&scene=virtue-many-faces")?.sceneId).toBe("virtue-many-faces");
  expect(lesson?.scenes.some(scene => scene.type === "completion" || scene.type === "lesson-reflection")).toBe(false);
});

test("catalog opens Meno and all hypotheses remain neutral and survive back navigation", async ({ page }, info) => {
  test.setTimeout(60_000);
  await page.goto("/learn");
  await page.locator('[data-node-id="plato"]').click();
  await page.getByRole("button", { name: "Добродетель и правильная жизнь", exact: true }).click();
  await page.getByRole("button", { name: "Что значит быть хорошим человеком?", exact: true }).click();
  const scene = page.getByTestId("virtue-intro-scene");
  await expect(scene).toContainText("Сократ, скажи");
  await scene.screenshot({ path: info.outputPath("01-meeting.png"), animations: "disabled" });
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(scene.getByRole("button", { name: "Продолжить", exact: true })).toBeDisabled();
  const hypotheses = ["Этому можно научиться", "Добродетель развивается через поступки и упражнения", "Многое зависит от характера человека с рождения", "Пока не знаю"];
  for (const hypothesis of hypotheses) {
    const choice = scene.getByRole("button", { name: hypothesis, exact: true });
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await scene.screenshot({ path: info.outputPath(`02-choice-${hypotheses.indexOf(hypothesis)}.png`), animations: "disabled" });
    await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
    await expect(scene.getByRole("heading", { name: "Но что такое добродетель?" })).toBeVisible();
    await expect(scene).toContainText("Менон, прежде чем выяснять");
    await expect(scene.getByRole("heading", { name: "Но что такое добродетель?" })).toHaveCSS("opacity", "1");
    await expect(scene.getByText("Менон, прежде чем выяснять", { exact: false })).toHaveCSS("opacity", "1");
    await expect(scene).not.toContainText(/Правильно!|Неправильно|Верно!/);
    await scene.getByRole("button", { name: "Назад", exact: true }).click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
  }
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(scene.getByRole("heading", { name: "Но что такое добродетель?" })).toHaveCSS("opacity", "1");
  await expect.poll(() => scene.getByText("Менон, прежде чем выяснять", { exact: false }).evaluate(el => getComputedStyle(el.parentElement!).opacity)).toBe("1");
  await scene.screenshot({ path: info.outputPath("03-turn.png") });
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(scene).toContainText("ἀρετή");
  await scene.screenshot({ path: info.outputPath("04-arete.png"), animations: "disabled" });
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(scene).toContainText("Иногда, прежде чем искать ответ");
  await expect(scene.getByRole("button", { name: /Завершить урок/ })).toHaveCount(0);
  await scene.screenshot({ path: info.outputPath("05-thought.png"), animations: "disabled" });
  expect(await page.evaluate(() => localStorage.getItem("sophia.lesson-completions.v1"))).toBeNull();
  await scene.getByRole("button", { name: "Повторить сцену" }).click();
  await expect(scene).toContainText("Сократ, скажи");
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(scene.locator('[aria-pressed="true"]')).toHaveCount(0);
  await scene.getByRole("button", { name: "Вернуться в каталог" }).click();
  await expect(scene).toHaveCount(0);
  await expect(page.getByTestId("philosopher-catalog")).toBeVisible();
});

for (const width of [390, 768, 1024, 1440]) test(`Meno layout ${width}px and reduced motion remain accessible`, async ({ page }, info) => {
  test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/learn#lesson=plato-virtue-definition&scene=meno-question");
    const scene = page.getByTestId("virtue-intro-scene");
    await expect(scene).toBeVisible();
    await expect.poll(() => scene.locator("img").evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    for (let stage = 0; stage < 5; stage++) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await scene.screenshot({ path: info.outputPath(`${width}-stage-${stage}.png`) });
      const results = await new AxeBuilder({ page }).include('[data-testid="virtue-intro-scene"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(results.violations).toEqual([]);
      if (stage === 1) await scene.getByRole("button", { name: "Пока не знаю", exact: true }).click();
      if (stage < 4) await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
    }
    expect(await scene.locator("h3").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
});
