import { expect, test } from "@playwright/test";

const intro = "/learn#lesson=plato-introduction&scene=";

test("answers on separate slides survive overlapping sessions, and the last answer wins on the same slide", async ({ page, context }) => {
  const other = await context.newPage();
  await Promise.all([page.goto(intro + "poet"), other.goto(intro + "socrates")]);
  await page.getByRole("radio").nth(1).check();
  await other.getByRole("radio").nth(0).check();
  await Promise.all([page.reload(), other.reload()]);
  await expect(page.getByRole("radio").nth(1)).toBeChecked();
  await expect(other.getByRole("radio").nth(0)).toBeChecked();

  await other.goto(intro + "poet");
  await expect(other.getByRole("radio").nth(1)).toBeChecked();
  await other.getByRole("radio").nth(0).check();
  await page.reload();
  await expect(page.getByRole("radio").nth(0)).toBeChecked();
});

test("legacy answers are retained after a failed v2 write and are superseded only by a successful edit", async ({ page }) => {
  await page.goto("/learn");
  const legacy = await page.evaluate(() => {
    const raw = JSON.stringify({ version: 1, run: { version: 1, sceneId: "poet", exercises: {} },
      scenes: { "meno-question": { stage: 1, selected: "unknown" } }, scrollOffsets: {} });
    localStorage.setItem("sophia.lesson-resume.v1:plato-virtue-definition", raw);
    return raw;
  });
  const url = "/learn#lesson=plato-virtue-definition&scene=meno-question";
  await page.goto(url);
  const unknown = page.getByRole("button", { name: "Пока не знаю", exact: true });
  const choice = page.getByRole("button", { name: "Этому можно научиться", exact: true });
  await expect(unknown).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.includes(":field:selected")) throw new DOMException("Denied", "QuotaExceededError");
      set.call(this, key, value);
    };
  });
  await choice.click();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(unknown).toHaveAttribute("aria-pressed", "true");
  await choice.click();
  await page.reload();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => localStorage.getItem("sophia.lesson-resume.v1:plato-virtue-definition"))).toBe(legacy);
});

test("cross-lesson fragments and browser history keep the visible scene in sync", async ({ page }) => {
  await page.goto(intro + "poet");
  const ordinary = page.getByTestId("lesson-scene");
  await expect(ordinary).toHaveAttribute("data-scene-id", "poet");
  await page.evaluate(() => { location.hash = "lesson=plato-virtue-definition&scene=virtue-lesson-finale"; });
  await expect(page.getByTestId("virtue-finale-scene")).toBeVisible();
  await page.evaluate(() => { location.hash = "lesson=plato-virtue-definition&scene=virtue-many-faces"; });
  await expect(page.getByTestId("virtue-gallery-scene")).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId("virtue-finale-scene")).toBeVisible();
  await page.goBack();
  await expect(ordinary).toHaveAttribute("data-scene-id", "poet");
  await expect(page).toHaveURL(/lesson=plato-introduction&scene=poet$/);
  await page.goForward();
  await expect(page.getByTestId("virtue-finale-scene")).toBeVisible();
});
