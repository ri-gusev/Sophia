import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openNavigation(page: Page) {
  const toggle = page.getByRole("button", { name: /^(Открыть|Закрыть) меню$/ });
  if (await toggle.isVisible()) await toggle.click();
}

test("landing contains exactly three agreed sections and three direction cards", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main > section")).toHaveCount(3);
  const sections = page.locator("main > section");
  await expect(sections.nth(0).getByRole("heading", { level: 1 })).toContainText("Большие вопросы.");
  await expect(sections.nth(1).getByRole("heading", { level: 2 })).toContainText("Не просто уроки.");
  await expect(sections.nth(1).getByRole("listitem")).toHaveCount(5);
  await expect(sections.nth(2).getByRole("heading", { level: 2 })).toContainText("Не заучивать.");
  const cards = sections.nth(2).getByRole("article");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).getByRole("link", { name: "Начать курс" })).toHaveAttribute("href", "/learn");
  await expect(cards.nth(1).getByRole("heading")).toHaveText("Разговор с философом");
  await expect(cards.nth(1).getByRole("button", { name: "Разговор с философом", exact: true })).toBeEnabled();
  for (const card of [cards.nth(2)]) {
    await expect(card.getByRole("heading")).toHaveText("—");
    await expect(card).toContainText("Скоро");
    await expect(card.getByRole("link")).toHaveCount(0);
    await expect(card.getByRole("button")).toHaveCount(0);
  }
  await expect(page.locator("footer")).toHaveCount(0);
});

test("every philosophical answer receives a neutral explanation and can be retried", async ({ page }) => {
  await page.goto("/");
  const question = page.getByRole("group", { name: "Философский вопрос", exact: true });
  const options = ["Да, это всё тот же корабль.", "Нет, это уже другой корабль.", "Зависит от того, что считать тождеством."];
  for (const option of options) {
    const answer = question.getByRole("button", { name: option, exact: true });
    await answer.focus();
    await page.keyboard.press("Enter");
    await expect(answer).toHaveAttribute("aria-pressed", "true");
    await expect(question.getByRole("status")).toHaveText("Это парадокс корабля Тесея. Философы используют его, чтобы исследовать проблему тождества: что позволяет вещи оставаться самой собой, даже когда она изменяется?");
    await expect(question.getByRole("status")).not.toContainText(/верно|неверно|правильный/i);
    await question.getByRole("button", { name: "Попробовать ещё раз" }).click();
    await expect(question.getByRole("button", { name: options[0], exact: true })).toBeFocused();
    await expect(question.getByRole("status")).toBeEmpty();
  }
  await question.getByRole("button", { name: options[0], exact: true }).click();
  await page.reload();
  await expect(question.getByRole("status")).toBeEmpty();
  await expect(question.getByRole("button", { name: options[0], exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("all course entry points lead to learn and return navigation works", async ({ page }) => {
  for (const label of ["Начать обучение", "Начать бесплатно", "Перейти к основному курсу", "Начать курс", "Обучение"]) {
    await page.goto("/");
    if (label === "Начать бесплатно" || label === "Обучение") await openNavigation(page);
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Основной курс философии");
    await expect(page.getByRole("region", { name: "Карта основного курса", exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Вернуться на главную", exact: true })).toHaveAttribute("href", "/");
    await page.getByRole("link", { name: "Вернуться на главную" }).click();
    await expect(page).toHaveURL(/\/$/);
  }
  await page.goto("/learn");
  await page.getByRole("link", { name: "Sophia — на главную" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("how-it-works anchors work from both routes and mobile menu closes", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /^(Открыть|Закрыть) меню$/ });
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
  }
  for (const route of ["/", "/learn"]) {
    await page.goto(route);
    if (route === "/") await openNavigation(page);
    await page.getByRole("navigation").getByRole("link", { name: "Как это работает" }).click();
    await expect(page).toHaveURL(/\/#how-it-works$/);
    await expect(page.getByRole("heading", { name: "Не заучивать. Понимать." })).toBeInViewport();
    if (await toggle.isVisible()) await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
  await page.goto("/");
  await openNavigation(page);
  await expect(page.getByRole("button", { name: "Атлас" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Войти" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Атлас", exact: true })).toHaveCount(0);
});

test("both routes fit narrow and wide screens with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/learn"]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test("both routes have no detected accessibility or runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  for (const route of ["/", "/learn"]) {
    await page.goto(route);
    if (route === "/") await page.getByRole("button", { name: "Да, это всё тот же корабль.", exact: true }).click();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
  }
  expect(errors).toEqual([]);
});
