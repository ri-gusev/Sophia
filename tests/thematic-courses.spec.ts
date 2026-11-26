import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const courses = [
  ["political-philosophy", "Политическая философия", "Власть, государство, свобода и справедливость. Исследуй философские основания общественного устройства и отношений человека с государством."],
  ["russian-philosophy", "Русская философия", "Познакомься с идеями русских мыслителей, их размышлениями о человеке, свободе, вере и смысле существования."],
  ["eastern-philosophy", "Восточная философия", "Исследуй философские традиции Китая, Индии и других культур Востока, их представления о гармонии, сознании и человеческой жизни."],
  ["history-of-philosophy", "История философии", "Проследи развитие философской мысли, её ключевые эпохи, интеллектуальные перевороты и взаимосвязи между направлениями."],
] as const;

const educationLinks = [
  ["Основной курс", "/learn"],
  ["Тематические курсы", "/courses"],
  ["Философский атлас", "/atlas"],
  ["Библиотека", "/library"],
  ["Диалоги с философами", "/chat"],
] as const;

const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function openMainNavigation(page: Page) {
  const mobileMenu = page.getByRole("button", { name: "Открыть меню", exact: true });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  return page.getByRole("navigation", { name: "Основная навигация" });
}

async function expectLocalCover(image: Locator, slug: string) {
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element: HTMLImageElement, course) => {
    if (!element.currentSrc || !element.complete || element.naturalWidth === 0) return false;
    const url = new URL(element.currentSrc);
    return url.origin === location.origin &&
      (url.searchParams.get("url") ?? url.pathname) === `/images/courses/${course}.webp`;
  }, slug)).toBe(true);
}

test("catalog shows exactly four directions with original covers in the responsive grid", async ({ page }, info) => {
  expect((await page.goto("/courses"))?.status()).toBe(200);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("За пределами курса");
  await expect(main).toContainText("Исследуй философию за пределами основного курса. Выбирай темы, которые интересуют именно тебя");
  const cards = main.getByRole("list", { name: "Направления" }).getByRole("listitem");
  await expect(cards).toHaveCount(4);

  const positions = [];
  for (const [index, [slug, name, description]] of courses.entries()) {
    const card = cards.nth(index);
    const link = card.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", `/courses/${slug}`);
    await expect(card).toContainText(description);
    await expectLocalCover(card.locator("img"), slug);
    positions.push(await card.evaluate((element) => {
      const { x, y } = element.getBoundingClientRect();
      return { x: Math.round(x + scrollX), y: Math.round(y + scrollY) };
    }));
  }

  const mobile = info.project.name === "mobile";
  expect(new Set(positions.map(({ x }) => x)).size).toBe(mobile ? 1 : 2);
  expect(new Set(positions.map(({ y }) => y)).size).toBe(mobile ? 4 : 2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("all four catalog cards lead to real pages and back, and an unknown direction is a 404", async ({ page }) => {
  await page.goto("/courses");
  const main = page.getByRole("main");
  for (const [index, [slug, name, description]] of courses.entries()) {
    if (index === 0) {
      await main.getByRole("listitem").first().click({ position: { x: 30, y: 30 } });
    } else {
      await main.getByRole("link", { name, exact: true }).click();
    }
    await expect(page).toHaveURL(new RegExp(`/courses/${slug}$`));
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(name);
    await expect(main).toContainText(description);
    await expect(main.getByRole("heading", { name: "Курс находится в разработке" })).toBeVisible();
    await expect(main.locator('a[href^="/lesson"], a[href^="/learn/"]')).toHaveCount(0);
    await expectLocalCover(main.locator("img"), slug);
    await main.getByRole("link", { name: "К тематическим курсам" }).click();
    await expect(page).toHaveURL(/\/courses$/);
  }
  expect((await page.goto("/courses/unknown-direction"))?.status()).toBe(404);
});

test("the shared education disclosure supports keyboard navigation and outside dismissal", async ({ page }, info) => {
  await page.goto("/courses/political-philosophy");
  await page.evaluate(() => document.fonts.ready);
  const navigation = await openMainNavigation(page);
  const disclosure = navigation.getByRole("button", { name: "Обучение", exact: true });
  const main = page.getByRole("main");
  const heading = main.getByRole("heading", { level: 1 });
  const initialHeadingTop = await heading.evaluate((element) => element.getBoundingClientRect().top + scrollY);
  const firstLink = navigation.getByRole("link", { name: "Основной курс", exact: true });

  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(firstLink).toHaveCount(0);
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");

  for (const [name, href] of educationLinks) {
    const link = navigation.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAccessibleDescription(/\S/);
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
  }
  const activeLink = navigation.getByRole("link", { name: "Тематические курсы", exact: true });
  await expect(activeLink).toHaveAttribute("aria-current", "location");
  if (info.project.name === "desktop") {
    expect(await heading.evaluate((element) => element.getBoundingClientRect().top + scrollY)).toBe(initialHeadingTop);
  }

  await page.keyboard.press("Escape");
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(disclosure).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(navigation.getByRole("link", { name: "Войти", exact: true })).toBeFocused();

  await disclosure.click();
  await page.mouse.click(5, page.viewportSize()!.height - 8);
  await expect(firstLink).toHaveCount(0);
});

test("selecting a destination closes the navigation and marks the current page", async ({ page }, info) => {
  await page.goto("/");
  let navigation = await openMainNavigation(page);
  let disclosure = navigation.getByRole("button", { name: "Обучение", exact: true });
  await disclosure.click();
  await navigation.getByRole("link", { name: "Тематические курсы", exact: true }).click();
  await expect(page).toHaveURL(/\/courses$/);

  if (info.project.name === "mobile") {
    await expect(page.getByRole("button", { name: "Открыть меню", exact: true })).toHaveAttribute("aria-expanded", "false");
  } else {
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  }
  navigation = await openMainNavigation(page);
  disclosure = navigation.getByRole("button", { name: "Обучение", exact: true });
  await disclosure.click();
  await expect(navigation.getByRole("link", { name: "Тематические курсы", exact: true })).toHaveAttribute("aria-current", "page");
});

test("catalog, direction and expanded navigation have no detectable accessibility violations", async ({ page }) => {
  await page.goto("/courses");
  const navigation = await openMainNavigation(page);
  await navigation.getByRole("button", { name: "Обучение", exact: true }).click();
  expect((await new AxeBuilder({ page }).withTags(wcag).analyze()).violations).toEqual([]);

  await page.goto("/courses/eastern-philosophy");
  expect((await new AxeBuilder({ page }).withTags(wcag).analyze()).violations).toEqual([]);
});

test("the expanded navigation fits narrow and wide viewports with reduced motion", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const widths = info.project.name === "mobile" ? [320, 390] : [768, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/courses");
    await page.evaluate(() => document.fonts.ready);
    const navigation = await openMainNavigation(page);
    await navigation.getByRole("button", { name: "Обучение", exact: true }).click();
    const lastMenuLink = navigation.getByRole("link", { name: "Диалоги с философами", exact: true });
    await lastMenuLink.scrollIntoViewIfNeeded();
    await expect(lastMenuLink).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("the longest direction title wraps at a word boundary", async ({ page }, info) => {
  await page.goto("/courses/political-philosophy");
  await page.evaluate(() => document.fonts.ready);
  const heading = page.getByRole("heading", { level: 1, name: "Политическая философия", exact: true });
  const widths = info.project.name === "mobile" ? [320, 390] : [721, 1440];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    const firstWordLines = await heading.evaluate((element, length) => {
      const text = element.firstChild;
      if (!text) return 0;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, length);
      return range.getClientRects().length;
    }, "Политическая".length);
    expect(firstWordLines, `title word at ${width} px`).toBe(1);
  }
});
