import { expect, test } from "@playwright/test";
import { PHILOSOPHERS } from "../src/features/philosophy-atlas/philosophers-data";
import { isAliveAt, toAxisYear, formatHistoricalYear } from "../src/features/philosophy-atlas/historical-time";

test("nine additions cover every year of the early medieval gap without duplicate IDs", () => {
  const ids = ["philoponus", "isidore", "maximus", "fazang", "bede", "shantarakshita", "dharmottara", "al-kindi", "eriugena"];
  expect(PHILOSOPHERS).toHaveLength(89);
  for (const id of ids) expect(PHILOSOPHERS.filter(person => person.id === id)).toHaveLength(1);
  for (let year = 527; year <= 869; year++) expect(PHILOSOPHERS.some(person => isAliveAt(person, year)), String(year)).toBe(true);
  const fixtures: Record<number, string[]> = {
    527: ["philoponus"], 570: ["philoponus", "isidore"], 571: ["isidore"],
    600: ["isidore", "maximus"], 637: ["maximus"],
    700: ["fazang", "bede"], 713: ["bede"], 736: ["shantarakshita"],
    788: ["shantarakshita", "dharmottara"], 789: ["dharmottara"],
    800: ["dharmottara", "al-kindi", "eriugena"], 801: ["al-kindi", "eriugena"],
    869: ["al-kindi", "eriugena"], 870: ["al-kindi", "eriugena", "al-farabi"],
  };
  for (const [year, expected] of Object.entries(fixtures)) expect(PHILOSOPHERS.filter(person => isAliveAt(person, Number(year))).map(person => person.id).sort(), year).toEqual(expected.sort());
});

test("early medieval thinkers have selectable cards and the same globe survives year changes", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/atlas");
  await expect(page.getByRole("status")).toHaveText("Глобус готов", { timeout: 30_000 });
  const canvas = await page.locator("canvas").elementHandle();
  const slider = page.getByRole("slider");
  for (const year of [527, 600, 700, 800, 869]) {
    await slider.fill(String(toAxisYear(year)));
    await expect(page.getByTestId("selected-year")).toHaveText(formatHistoricalYear(year));
    await expect(page.getByTestId("philosopher-count")).not.toHaveText("0 философов");
  }
  await slider.fill(String(toAxisYear(527)));
  await page.getByRole("button", { name: "Иоанн Филопон", exact: true }).click();
  const card = page.getByRole("complementary", { name: "Карточка философа" });
  await expect(card.getByRole("heading")).toHaveText("Иоанн Филопон");
  await expect(card).toContainText("Александрия");
  await expect(card).toContainText("Ок. 490");
  await page.screenshot({ path: testInfo.outputPath("early-medieval-card.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await slider.fill(String(toAxisYear(869)));
  const target = page.getByRole("button", { name: /Иоанн Скот Эриугена/ }).first();
  await target.click();
  if (await card.getByRole("heading", { name: "Философы рядом" }).count()) await card.getByRole("button", { name: "Иоанн Скот Эриугена", exact: true }).click();
  await expect(card.getByRole("heading")).toHaveText("Иоанн Скот Эриугена");
  await expect(card).toContainText("Лан");
  expect(await canvas!.evaluate(element => element.isConnected)).toBe(true);
});
