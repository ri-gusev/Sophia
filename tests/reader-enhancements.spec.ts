import { expect, test, type Page } from "@playwright/test";
import { loginTestAccount, seedVerifiedTestAccount } from "./support/accounts";

const text = (page: Page) => page.locator("[data-reader-text]");
const menu = (page: Page) => page.getByRole("group", { name: "Действия с выделенным текстом" });

async function selectPassage(page: Page, multi: boolean) {
  return text(page).first().evaluate((first, isMulti) => {
    const next = first.closest("p")?.nextElementSibling?.querySelector("[data-reader-text]");
    if (!next) throw new Error("Missing paragraph");
    const start = first.lastChild!;
    const end = isMulti ? next.lastChild! : start;
    const range = document.createRange();
    range.setStart(start, 1);
    range.setEnd(end, Math.min(18, end.textContent!.length));
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    return isMulti
      ? start.textContent!.slice(1) + "\n\n" + Array.from(next.childNodes).slice(0, -1).map(node => node.textContent).join("") + end.textContent!.slice(0, 18)
      : start.textContent!.slice(1, 18);
  }, multi);
}

test("exact overlapping selections survive reload, font and theme changes", async ({ page }, info) => {
  await page.goto("/reader/crito");
  await text(page).first().waitFor();
  const single = await selectPassage(page, false);
  await expect(menu(page)).toBeVisible();
  await menu(page).getByRole("button", { name: "Сохранить цитату" }).click();
  await expect(page.getByText("Добавлено в цитатник")).toBeVisible();
  const multi = await selectPassage(page, true);
  await expect(menu(page)).toBeVisible();
  await page.screenshot({ path: info.outputPath("selection-menu.png"), animations: "disabled" });
  await menu(page).getByRole("button", { name: "Сохранить цитату" }).click();
  await selectPassage(page, true);
  await menu(page).getByRole("button", { name: "Сохранить цитату" }).click();
  await expect(page.getByText("Эта цитата уже сохранена")).toBeVisible();
  await page.reload();
  await expect.poll(() => page.evaluate(() => CSS.highlights.get("sophia-quote")?.size)).toBe(3);
  await page.getByRole("button", { name: "Настройки чтения" }).click();
  const settings = page.getByRole("dialog", { name: "Настройки чтения" });
  await settings.getByRole("button", { name: "Тёмная" }).click();
  await settings.getByRole("slider", { name: "Размер шрифта" }).press("End");
  await page.keyboard.press("Escape");
  await expect(text(page).first()).toHaveCSS("font-size", "28px");
  await expect.poll(() => page.evaluate(() => CSS.highlights.get("sophia-quote")?.size)).toBe(3);
  expect(await text(page).first().evaluate(el => getComputedStyle(el, "::highlight(sophia-quote)").backgroundColor)).toBe("rgb(81, 74, 49)");
  await page.screenshot({ path: info.outputPath("highlighted-quote.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Цитаты", exact: true }).click();
  const quotes = page.getByRole("dialog", { name: "Цитаты" });
  await expect(quotes.getByText(single, { exact: true })).toBeVisible();
  await expect(quotes.getByText(multi.replace(/\s+/g, " "), { exact: true })).toBeVisible();
});

test("keyboard selection can open the quote actions", async ({ page }) => {
  await page.goto("/reader/crito");
  await text(page).first().waitFor();
  const region = page.getByRole("region", { name: "Текст произведения" });
  await region.focus();
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(menu(page)).toBeVisible();
  await menu(page).getByRole("button", { name: "Сохранить цитату" }).press("Enter");
  await expect(page.getByText("Добавлено в цитатник")).toBeVisible();
});

test("profile opens exact saved ranges and bookmarks without losing the normal reading position", async ({ page }) => {
  await loginTestAccount(page.request, await seedVerifiedTestAccount());
  await page.goto("/reader/crito");
  await text(page).first().waitFor();
  const contents = page.getByRole("region", { name: "Текст произведения" });
  const readActivity = () => page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.endsWith(".reader.v1"))!;
    return JSON.parse(localStorage.getItem(key)!).works.crito;
  });
  const opening = await readActivity();
  await contents.press("PageDown");
  await expect.poll(readActivity).not.toEqual(opening);
  await page.getByRole("button", { name: "Поставить закладку" }).click();
  await expect(page.getByText("Закладка добавлена")).toBeVisible();
  await selectPassage(page, true);
  await menu(page).getByRole("button", { name: "Сохранить цитату" }).click();
  const before = await readActivity();
  await page.goto("/profile");
  await page.getByText("Мой цитатник", { exact: true }).click();
  await page.getByRole("group", { name: "Мой цитатник" }).getByRole("link", { name: "Открыть в книге" }).click();
  await expect.poll(() => page.evaluate(() => CSS.highlights.get("sophia-quote-focus")?.size)).toBe(2);
  await contents.press("PageDown");
  expect(await readActivity()).toEqual(before);
  await page.goto("/profile");
  await page.getByText("Мои закладки", { exact: true }).click();
  await page.getByRole("group", { name: "Мои закладки" }).getByRole("link", { name: "Открыть в книге" }).click();
  await expect(page.locator("[data-bookmarked]")).toBeInViewport();
});

test("lesson source opens the exact fragment and returns to the same interactive stage", async ({ page }, info) => {
  await page.goto("/learn#lesson=plato-virtue-definition&scene=meno-question");
  const scene = page.getByTestId("virtue-intro-scene");
  await scene.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(scene).toHaveAttribute("data-stage", "1");
  const link = page.getByRole("link", { name: "Читать первоисточник" });
  await expect(link).toHaveAttribute("href", "/reader/meno?lesson=plato-virtue-definition&scene=meno-question#70a");
  await link.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("lesson-primary-source.png"), animations: "disabled" });
  await link.click();
  await expect(page.locator('[id="70a"]')).toBeInViewport();
  await expect(page.getByRole("link", { name: "Вернуться к уроку" })).toBeInViewport();
  await page.screenshot({ path: info.outputPath("lesson-source-reader.png"), animations: "disabled" });
  await page.getByRole("link", { name: "Вернуться к уроку" }).click();
  await expect(scene).toHaveAttribute("data-stage", "1");
  await expect(page).toHaveURL(/#lesson=plato-virtue-definition&scene=meno-question$/);
  await page.goto("/reader/meno?lesson=https%3A%2F%2Fexample.org&scene=meno-question#70a");
  await expect(page.getByRole("link", { name: "Вернуться к уроку" })).toHaveCount(0);
});
