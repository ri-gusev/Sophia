import { expect, test } from "@playwright/test";
import { FIRST_YEAR, LAST_YEAR, fromAxisYear, toAxisYear, isAliveAt, parseHistoricalYear, formatLifeDates } from "../src/features/philosophy-atlas/historical-time";
import { HISTORICAL_ERAS, getHistoricalEra } from "../src/features/philosophy-atlas/historical-eras";
import { PHILOSOPHERS } from "../src/features/philosophy-atlas/philosophers-data";

test("independent historical fixtures cover all eight requested years", () => {
  const expected: Record<number, string[]> = {
    [-400]: ["socrates", "democritus", "plato", "diogenes"],
    100: ["epictetus"],
    1200: ["maimonides"],
    1500: ["erasmus", "machiavelli"],
    1750: ["berkeley", "hume", "rousseau", "kant"],
    1850: ["schopenhauer", "comte", "mill", "kierkegaard", "marx", "nietzsche", "james"],
    1950: ["russell", "wittgenstein", "heidegger", "popper", "arendt", "sartre", "beauvoir", "camus", "adorno", "foucault", "derrida", "rawls", "kuhn", "habermas", "singer", "nussbaum", "zizek", "taylor", "ambedkar", "wiredu"],
    2026: ["habermas", "singer", "nussbaum", "butler", "zizek", "taylor", "chalmers", "appiah", "han", "diagne"],
  };
  for (const [year, ids] of Object.entries(expected)) expect(PHILOSOPHERS.filter(person => isAliveAt(person, Number(year))).map(person => person.id).sort(), year).toEqual(ids.sort());
  expect(PHILOSOPHERS.filter(person => person.deathYear === null)).toHaveLength(9);
  expect(PHILOSOPHERS.filter(person => !person.portrait).map(person => person.id).sort()).toEqual(["proclus", "wiredu"]);
  expect(PHILOSOPHERS.find(person => person.id === "avicenna")?.approximateBirth).toBe(true);
});

test("modern historical time supports living people, exact input and the full nonzero range", () => {
  expect([FIRST_YEAR, LAST_YEAR]).toEqual([-650, 2026]);
  expect(fromAxisYear(toAxisYear(-1) + 1)).toBe(1);
  const living = { birthYear: 1947, deathYear: null };
  expect(isAliveAt(living, 1946)).toBe(false);
  expect(isAliveAt(living, 1947)).toBe(true);
  expect(isAliveAt(living, 2026)).toBe(true);
  expect(isAliveAt(living, 2027)).toBe(false);
  expect(isAliveAt({ birthYear: 1929, deathYear: 2026 }, 2026)).toBe(true);
  expect(parseHistoricalYear("400", "bce")).toBe(-400);
  expect(parseHistoricalYear("2026", "ce")).toBe(2026);
  for (const input of ["", "0", "1.5", "abc", "2e3", "-100", "2027"]) expect(parseHistoricalYear(input, "ce")).toBeNull();
  expect(parseHistoricalYear("651", "bce")).toBeNull();
  expect(formatLifeDates({ ...living, approximateBirth: false, approximateDeath: false })).toBe("1947 г. н. э. — настоящее время");
});

test("seven era intervals have unambiguous boundaries and representative jumps", () => {
  expect(HISTORICAL_ERAS.map(era => era.jumpYear)).toEqual([-400, 1200, 1500, 1750, 1850, 1950, 2026]);
  expect(getHistoricalEra(-400).id).toBe("antiquity");
  expect(getHistoricalEra(1200).id).toBe("medieval");
  expect(getHistoricalEra(1500).id).toBe("renaissance");
  expect(getHistoricalEra(1750).id).toBe("early-modern");
  expect(getHistoricalEra(1900).id).toBe("nineteenth");
  expect(getHistoricalEra(1901).id).toBe("twentieth");
  expect(getHistoricalEra(2000).id).toBe("twentieth");
  expect(getHistoricalEra(2001).id).toBe("contemporary");
  expect(() => getHistoricalEra(0)).toThrow();
});

test("era jumps and exact year entry preserve the scene and handle invalid drafts", async ({ page }, testInfo) => {
  const textures: string[] = [];
  page.on("request", request => { if (request.url().includes("/textures/earth/")) textures.push(request.url()); });
  await page.goto("/atlas");
  await expect(page.getByRole("status")).toHaveText("Глобус готов", { timeout: 30_000 });
  const canvas = await page.locator("canvas").elementHandle();
  const initialTextures = textures.length;
  for (const period of HISTORICAL_ERAS) {
    if (testInfo.project.name === "mobile") await page.getByLabel("Перейти к эпохе").selectOption(period.id);
    else await page.getByRole("button", { name: period.name, exact: true }).click();
    await expect(page.getByTestId("philosopher-count")).toHaveText(new RegExp(`^${PHILOSOPHERS.filter(person => isAliveAt(person, period.jumpYear)).length} `));
  }
  const jump = page.getByRole("button", { name: "XXI век", exact: true });
  if (testInfo.project.name === "mobile") await page.getByLabel("Перейти к эпохе").selectOption("contemporary");
  else { await expect(jump).toBeVisible(); await jump.click(); }
  await expect(page.getByTestId("selected-year")).toHaveText("2026 г. н. э.");
  expect(await canvas!.evaluate(element => element.isConnected)).toBe(true);
  const year = page.getByRole("textbox", { name: "Точный год" });
  const era = page.getByLabel("Эра года");
  await year.fill("0");
  await year.press("Enter");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("нулевого года");
  await expect(page.getByTestId("selected-year")).toHaveText("2026 г. н. э.");
  await year.fill("400");
  await era.selectOption("bce");
  await page.getByRole("button", { name: "Перейти", exact: true }).click();
  await expect(page.getByTestId("selected-year")).toHaveText("400 г. до н. э.");
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await year.fill("1750");
  await era.selectOption("ce");
  await year.press("Enter");
  await expect(year).toBeFocused();
  await expect(page.getByTestId("selected-year")).toHaveText("1750 г. н. э.");
  if (testInfo.project.name === "desktop") await expect(page.getByRole("button", { name: "Новое время и Просвещение", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(textures).toHaveLength(initialTextures);
  await page.screenshot({ path: testInfo.outputPath("modern-1750.png"), fullPage: true });
});

test("modern groups expose living biographies and failed portraits use initials", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let failedRequests = 0;
  await page.route("**/images/philosophers/modern/zizek.*", route => { failedRequests++; return route.abort(); });
  await page.goto("/atlas");
  await expect(page.getByRole("status")).toHaveText("Глобус готов", { timeout: 30_000 });
  await page.getByRole("slider").fill("2025");
  await expect(page.getByTestId("philosopher-count")).toHaveText("10 философов");
  const group = page.getByRole("button", { name: /Философы:.*Славой Жижек/ }).first();
  const single = page.getByRole("button", { name: "Славой Жижек", exact: true });
  await expect(group.or(single)).toBeVisible();
  if (await group.count()) { await group.click(); await single.click(); }
  else await single.click();
  const card = page.getByRole("complementary", { name: "Карточка философа" });
  await expect(card.getByRole("heading")).toHaveText("Славой Жижек");
  await expect(card).toContainText("настоящее время");
  await expect(card.getByRole("img", { name: "Инициалы: Славой Жижек" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Закрыть карточку" })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("modern-living-card.png"), fullPage: true });
  const failures = failedRequests;
  await page.waitForTimeout(250);
  expect(failedRequests).toBe(failures);
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
});
