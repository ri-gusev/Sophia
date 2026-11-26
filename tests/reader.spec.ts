import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginTestAccount, postAccount, seedVerifiedTestAccount } from "./support/accounts";

const guestKey = "sophia.reader.v1";
const bookIds = ["apology", "euthyphro", "crito", "phaedo", "symposium", "republic"];
const content = (page: Page) => page.getByRole("region", { name: "Текст произведения" });
const currentParagraphs = (page: Page) => content(page).locator("[data-paragraph]");
const citation = (page: Page, reference: string) => page.locator(`[id="${reference}"]`);

test("библиотека открывается с главной и ищет по названию и автору", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Открыть библиотеку" }).click();
  await expect(page.getByRole("heading", { name: "Библиотека", exact: true })).toBeVisible();
  const search = page.getByRole("searchbox");
  await search.fill("государство");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Государство");
  await search.fill("платон");
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(6);
  await search.fill("");
  await page.getByRole("button", { name: "Читаю" }).click();
  await expect(page.getByText("Здесь появятся начатые произведения")).toBeVisible();
});

test("ссылка Стефана открывает нужную книгу без первоначальной загрузки других книг", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => {
    if (request.url().includes("/api/reader/")) requests.push(new URL(request.url()).pathname);
  });
  const initialSection = page.waitForResponse(response => response.url().endsWith("/api/reader/republic/book-7"));
  await page.goto("/reader/republic#514a");
  await expect(citation(page, "514a")).toBeInViewport();
  const response = await initialSection;
  expect(response.headers()["content-type"]).toContain("application/json");
  expect((await response.body()).length).toBeLessThan(150_000);
  expect(requests).toEqual(["/api/reader/republic/book-7"]);
  await page.getByRole("button", { name: "Оглавление" }).click();
  const contents = page.getByRole("dialog", { name: "Оглавление" });
  await expect(contents.locator('button[aria-current="location"]')).toContainText("Книга седьмая");
  await contents.getByRole("button", { name: /Книга восьмая/ }).click();
  await expect(content(page).getByRole("heading", { name: "Книга восьмая" })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", /[5-9]\d/);
  expect(requests).toEqual(["/api/reader/republic/book-7", "/api/reader/republic/book-8"]);
});

test("каждый текст доступен гостю, библиотека показывает начатые и прочитанные", async ({ page }) => {
  for (const id of bookIds) {
    await page.goto("/reader/" + id);
    await expect(currentParagraphs(page).first()).toBeVisible();
  }
  await page.getByRole("button", { name: "Отметить прочитанным" }).click();
  await page.getByRole("link", { name: "Вернуться в библиотеку" }).click();
  await page.getByRole("button", { name: "Читаю" }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5);
  await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText("Пир");
  await page.getByRole("button", { name: "Прочитано" }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Государство");
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "100");
});

test("чтение возобновляется после смены ширины, а переход к цитате оставляет снимок", async ({ page }) => {
  await page.goto("/reader/apology");
  await expect(currentParagraphs(page).first()).toBeVisible();
  async function savedPosition() {
    return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "{}").works?.apology?.position as {
      paragraphId: string; fraction: number;
    }, guestKey);
  }
  const first = await savedPosition();
  await content(page).press("PageDown");
  await expect.poll(savedPosition).not.toEqual(first);
  const before = await savedPosition();
  const fragment = () => page.locator(`[data-paragraph="${before.paragraphId}"]`);
  await page.setViewportSize({ width: 320, height: 690 });
  await expect(fragment()).toBeInViewport();
  await page.setViewportSize({ width: 690, height: 320 });
  await expect(fragment()).toBeInViewport();
  await page.reload();
  await expect(fragment()).toBeInViewport();
  const saved = await page.evaluate(key => localStorage.getItem(key), guestKey);
  await page.goto("/reader/apology#38a");
  await expect(citation(page, "38a")).toBeInViewport();
  expect(await page.evaluate(key => localStorage.getItem(key), guestKey)).toBe(saved);
  await page.goto("/reader/phaedo#72e");
  await expect(citation(page, "72e")).toBeInViewport();
  expect(await page.evaluate(key => localStorage.getItem(key), guestKey)).toBe(saved);
  await page.goto("/reader/apology");
  await expect(fragment()).toBeInViewport();
});

test("закладки разных разделов, удаление и сохранение максимального прогресса", async ({ page }) => {
  await page.goto("/reader/republic");
  await expect(currentParagraphs(page).first()).toBeVisible();
  const add = page.getByRole("button", { name: "Поставить закладку" });
  await add.click();
  await add.click();
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(content(page).getByRole("heading", { name: "Книга вторая" })).toBeVisible();
  await add.click();
  const progress = page.getByRole("progressbar");
  await expect(progress).not.toHaveAttribute("value", "0");
  const high = await progress.getAttribute("value");
  await page.getByRole("button", { name: "Назад" }).click();
  await expect(content(page).getByRole("heading", { name: "Книга первая" })).toBeVisible();
  await expect(progress).toHaveAttribute("value", high!);
  await page.getByRole("button", { name: "Закладки", exact: true }).click();
  const bookmarks = page.getByRole("dialog", { name: "Закладки" });
  await expect(bookmarks.getByRole("listitem")).toHaveCount(2);
  await bookmarks.getByRole("listitem").first().getByRole("button").first().click();
  await expect(citation(page, "357a")).toBeInViewport();
  await page.getByRole("button", { name: "Закладки", exact: true }).click();
  await bookmarks.getByRole("button", { name: /Удалить закладку/ }).first().click();
  await expect(bookmarks.getByRole("listitem")).toHaveCount(1);
});

test("гость и два аккаунта используют разные данные, удаление очищает свой снимок", async ({ page }) => {
  const first = await seedVerifiedTestAccount();
  const second = await seedVerifiedTestAccount();
  const completion = () => page.getByRole("button", { name: "Отметить прочитанным" });
  const guestSnapshot = () => page.evaluate(key => localStorage.getItem(key), guestKey);
  await page.goto("/reader/crito");
  await expect(currentParagraphs(page).first()).toBeVisible();
  await completion().click();
  const guest = await guestSnapshot();
  expect(guest).toContain('"completed":true');

  await loginTestAccount(page.request, first);
  const { accountId } = await (await page.request.get("/api/progress")).json();
  await page.reload();
  await expect(currentParagraphs(page).first()).toBeVisible();
  await completion().click();
  const firstKey = `sophia.account.${accountId}.reader.v1`;
  const accountSnapshot = () => page.evaluate(key => localStorage.getItem(key), firstKey);
  const written = await accountSnapshot();
  expect(written).toContain('"completed":true');
  expect(await guestSnapshot()).toBe(guest);

  expect((await postAccount(page.request, "logout", { accountId })).ok()).toBe(true);
  await loginTestAccount(page.request, second);
  const { accountId: secondId } = await (await page.request.get("/api/progress")).json();
  await page.reload();
  await expect(currentParagraphs(page).first()).toBeVisible();
  await expect(completion()).toBeVisible();
  expect(await accountSnapshot()).toBe(written);

  expect((await postAccount(page.request, "logout", { accountId: secondId })).ok()).toBe(true);
  await loginTestAccount(page.request, first);
  await page.goto("/profile");
  await page.locator("summary", { hasText: /^Конфиденциальность$/ }).click();
  const deletion = page.getByRole("region", { name: "Удаление аккаунта" });
  const remove = deletion.getByRole("button", { name: "Отозвать согласие и удалить аккаунт" });
  await remove.click();
  await deletion.getByLabel("Текущий пароль").fill(first.password);
  await deletion.getByRole("checkbox").check();
  await remove.click();
  await expect(page).toHaveURL(/\/$/);
  expect(await accountSnapshot()).toBeNull();
  expect(await guestSnapshot()).toBe(guest);
});

test("темы и настройки доступны с клавиатуры, повреждённый снимок восстанавливается", async ({ page }, testInfo) => {
  const themeAttribute = page.getByRole("main");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Библиотека", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("library.png"), fullPage: true });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.evaluate(key => localStorage.setItem(key, "{invalid json}"), guestKey);
  await page.goto("/reader/euthyphro");
  await expect(currentParagraphs(page).first()).toBeVisible();
  await expect(themeAttribute).toHaveAttribute("data-theme", "paper");
  const panelButton = page.getByRole("button", { name: "Настройки чтения" });
  const panel = page.getByRole("dialog", { name: "Настройки чтения" });
  for (const [label, theme] of [["Светлая", "light"], ["Бумажная", "paper"], ["Тёмная", "dark"]]) {
    await panelButton.press("Enter");
    await panel.getByRole("button", { name: label }).press("Enter");
    await expect(themeAttribute).toHaveAttribute("data-theme", theme);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(panelButton).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`reader-${theme}.png`) });
  }
  await panelButton.click();
  await panel.getByRole("slider", { name: "Размер шрифта" }).press("End");
  await panel.getByRole("slider", { name: "Межстрочный интервал" }).press("End");
  await page.keyboard.press("Escape");
  await expect(currentParagraphs(page).first()).toHaveCSS("font-size", "28px");
  await page.setViewportSize({ width: 320, height: 620 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.reload();
  await expect(themeAttribute).toHaveAttribute("data-theme", "dark");
  await expect(currentParagraphs(page).first()).toHaveCSS("font-size", "28px");
  await expect(currentParagraphs(page).first()).toHaveCSS("line-height", "61.6px");
});
