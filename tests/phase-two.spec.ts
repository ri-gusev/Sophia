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
  await expect(cards.nth(2).getByRole("heading")).toHaveText("Прикоснись к первоисточникам");
  await expect(cards.nth(2).getByRole("link", { name: "Открыть библиотеку" })).toHaveAttribute("href", "/library");
  const contact = page.getByRole("contentinfo").getByRole("link", { name: "support.sophia@ro.ru", exact: true });
  await expect(contact).toHaveAttribute("href", "mailto:support.sophia@ro.ru");
});

test("all course entry points lead to learn and return navigation works", async ({ page }) => {
  for (const label of ["Начать обучение", "Начать бесплатно", "Перейти к основному курсу", "Начать курс", "Основной курс"]) {
    await page.goto("/");
    if (label === "Начать бесплатно" || label === "Основной курс") await openNavigation(page);
    if (label === "Основной курс") await page.getByRole("button", { name: "Обучение", exact: true }).click();
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Основной курс философии");
    await expect(page.getByRole("region", { name: "Карта основного курса", exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Вернуться на главную", exact: true })).toHaveAttribute("href", "/");
    await page.getByRole("link", { name: "Вернуться на главную" }).click();
    await expect(page).toHaveURL(/\/$/);
  }
  await page.goto("/learn");
  await page.getByRole("link", { name: "София — на главную" }).click();
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
  const navigation = page.getByRole("navigation", { name: "Основная навигация" });
  const education = navigation.getByRole("button", { name: "Обучение", exact: true });
  await education.click();
  await expect(navigation.getByRole("link", { name: "Философский атлас", exact: true })).toHaveAttribute("href", "/atlas");
  await education.click();
  await expect(navigation.locator('a[href="/register"]')).toHaveCount(0);
  await navigation.getByRole("link", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("main").getByText("Нет аккаунта?")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Зарегистрироваться" })).toHaveAttribute("href", "/register");
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
    if (route === "/") {
      await page.getByRole("radiogroup").getByRole("radio").first().check();
      await page.getByRole("button", { name: "Проверить ответ" }).click();
    }
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
  }
  expect(errors).toEqual([]);
});
