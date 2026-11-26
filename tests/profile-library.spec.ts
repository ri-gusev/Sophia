import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loginTestAccount, seedVerifiedTestAccount } from "./support/accounts";

const library = (page: Page) => page.getByRole("region", { name: "Моя библиотека" });
const oldDate = "2026-11-20T10:00:00.000Z";
const recentDate = "2026-11-25T10:00:00.000Z";
const critoParagraph = "crito-part-1-p-1-1";
const apologyParagraph = "apology-part-1-p-1-1";

async function openLibrary(page: Page, data: object) {
  await loginTestAccount(page.request, await seedVerifiedTestAccount());
  const session = await page.request.get("/api/progress");
  expect(session.ok()).toBe(true);
  const { accountId } = await session.json() as { accountId: string };
  const key = `sophia.account.${encodeURIComponent(accountId)}.reader.v1`;
  await page.goto("/profile");
  await page.evaluate(({ key, data }) => {
    const { quotes, ...snapshot } = data as { quotes?: {
      workId: string; sectionId: string; edition: string; startParagraphId: string; startOffset: number;
      endParagraphId: string; endOffset: number; id: string;
    }[] };
    localStorage.setItem(key, JSON.stringify(snapshot));
    for (const quote of quotes ?? []) {
      const id = [quote.workId, quote.sectionId, quote.edition, quote.startParagraphId, quote.startOffset,
        quote.endParagraphId, quote.endOffset].map(encodeURIComponent).join(":");
      localStorage.setItem(key.replace(/reader\.v1$/, "reader-quotes.v1:") + id, JSON.stringify({ ...quote, id }));
    }
  }, { key, data });
  await page.reload();
}

test("the profile library shows reading activity in recency order and expands the remaining works", async ({ page }, info) => {
  await openLibrary(page, {
    works: {
      apology: { position: { sectionId: "part-1", paragraphId: apologyParagraph, fraction: 0 }, maxProgress: 42, lastActivityAt: oldDate },
      crito: { position: { sectionId: "part-1", paragraphId: critoParagraph, fraction: 0.5, percent: 12, reference: "43a" }, maxProgress: 90, lastActivityAt: recentDate },
      euthyphro: { completed: true, lastActivityAt: recentDate },
    },
  });
  const shelf = library(page);
  await expect(shelf.locator("dl dd")).toHaveText(["2", "1", "0"]);
  const newest = shelf.getByRole("article", { name: "Критон" });
  const older = shelf.getByRole("article", { name: "Апология Сократа" });
  await expect(newest.getByText(/Текущая позиция · 12 %/)).toBeVisible();
  await expect(newest.getByText("43a", { exact: true })).toBeVisible();
  await expect(newest.getByRole("link", { name: "Продолжить" })).toHaveAttribute("href", "/reader/crito");
  await expect(older).toBeHidden();
  await shelf.getByText("Все начатые произведения", { exact: true }).click();
  await expect(older.getByText("Дальняя позиция · 42 %")).toBeVisible();
  await shelf.getByText("Прочитанные произведения", { exact: true }).click();
  await expect(shelf.getByRole("article", { name: "Эвтифрон" }).getByRole("link")).toHaveAttribute("href", "/reader/euthyphro");
  expect((await new AxeBuilder({ page }).include("#profile-library").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await shelf.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("profile-library.png"), animations: "disabled" });
});

test("saved bookmarks can be searched, filtered, opened and deleted from the account library", async ({ page }) => {
  await openLibrary(page, { bookmarks: [
    { workId: "crito", sectionId: "part-1", paragraphId: critoParagraph, excerpt: "Что так рано пришел ты, Критон?", reference: "43a", createdAt: recentDate },
    { workId: "apology", sectionId: "part-1", paragraphId: apologyParagraph, excerpt: "Речь к афинянам", reference: "17a", fraction: 0.42, createdAt: oldDate },
  ] });
  const shelf = library(page);
  await shelf.getByText("Мои закладки", { exact: true }).click();
  const notes = shelf.getByRole("group", { name: "Мои закладки" });
  await notes.getByRole("searchbox", { name: "Поиск по закладкам" }).fill("КРиТОн");
  await expect(notes.getByText("Что так рано пришел ты, Критон?")).toBeVisible();
  await expect(notes.getByText("Речь к афинянам")).toBeHidden();
  await notes.getByRole("searchbox").clear();
  await notes.getByLabel("Произведение").selectOption("apology");
  await expect(notes.getByText("Речь к афинянам")).toBeVisible();
  await expect(notes.getByRole("link", { name: "Открыть в книге" })).toHaveAttribute("href", `/reader/apology?bookmark=${apologyParagraph}`);
  await notes.getByRole("button", { name: "Удалить закладку" }).click();
  await expect(notes.getByText("Речь к афинянам")).toBeHidden();
  await page.reload();
  await shelf.getByText("Мои закладки", { exact: true }).click();
  await expect(notes.getByText("Что так рано пришел ты, Критон?")).toBeVisible();
  await expect(notes.getByText("Речь к афинянам")).toBeHidden();
});

test("the quote collection sorts, filters, copies a citation and updates the quote total", async ({ page, context }, info) => {
  const critoText = "Что так рано пришел ты, Критон?";
  const apologyText = "Не знаю, Афиняне, какое впечатление сделали на вас мои обвинители";
  const early = { id: "quote-early", createdAt: oldDate, workId: "crito", sectionId: "part-1", startParagraphId: critoParagraph,
    endParagraphId: critoParagraph, startOffset: 7, endOffset: 7 + critoText.length, text: critoText, reference: "43a", edition: "crito-1863-1" };
  const recent = { ...early, id: "quote-recent", createdAt: recentDate, workId: "apology", startParagraphId: apologyParagraph,
    endParagraphId: apologyParagraph, startOffset: 0, endOffset: apologyText.length, text: apologyText, reference: "17a", edition: "apology-1863-1" };
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openLibrary(page, { quotes: [early, recent] });
  const shelf = library(page);
  await expect(shelf.locator("dl dd")).toHaveText(["0", "0", "2"]);
  await expect(shelf.getByRole("link", { name: "Перейти в библиотеку" })).toHaveAttribute("href", "/library");
  await shelf.getByText("Мой цитатник", { exact: true }).click();
  const quotes = shelf.getByRole("group", { name: "Мой цитатник" });
  await expect(quotes.locator("blockquote")).toHaveText([recent.text, early.text]);
  await quotes.locator("blockquote").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("quote-collection.png"), animations: "disabled" });
  await quotes.getByLabel("Сортировка").selectOption("oldest");
  await expect(quotes.locator("blockquote")).toHaveText([early.text, recent.text]);
  await quotes.getByRole("searchbox", { name: "Поиск по цитатам" }).fill("КРиТОн");
  await expect(quotes.locator("blockquote")).toHaveText([early.text]);
  await quotes.getByRole("searchbox").clear();
  await quotes.getByLabel("Произведение").selectOption("crito");
  await expect(quotes.locator("blockquote")).toHaveText([early.text]);
  await expect(quotes.getByRole("link", { name: "Открыть в книге" })).toHaveAttribute("href", /^\/reader\/crito\?quote=/);
  await quotes.getByRole("button", { name: "Скопировать с источником" }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  for (const value of [early.text, "Платон", "Критон", "Карпов", "43a"]) expect(clipboard).toContain(value);
  await quotes.getByRole("button", { name: "Удалить цитату" }).click();
  await expect(quotes.locator("blockquote")).toHaveText([recent.text]);
  await expect(shelf.locator("dl dd")).toHaveText(["0", "0", "1"]);
});
