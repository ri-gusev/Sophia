import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn");
});

test("antiquity has four ordered main nodes and one optional Plato branch", async ({ page }) => {
  const main = page.locator('[data-era-id="antiquity"][data-node-type="main"]');
  await expect(main).toHaveCount(4);
  expect(await main.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-node-id"))))
    .toEqual(["presocratics", "plato", "aristotle", "stoicism"]);
  const positions = await main.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().x));
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  const branch = page.locator('[data-node-id="plato-followers"]');
  await expect(branch).toHaveAttribute("data-node-type", "branch");
  await expect(branch).toHaveAttribute("data-parent-id", "plato");
  for (const era of ["medieval", "early-modern", "german", "contemporary"]) {
    await expect(page.locator(`[data-era-id="${era}"][data-node-type="main"]`)).toHaveCount(5);
    await expect(page.locator(`[data-era-id="${era}"][data-node-type="branch"]`)).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: /Сократ|Сенека|Марк Аврелий/ })).toHaveCount(0);
});

test("Plato opens a responsive adjacent catalog and closing restores map position and focus", async ({ page }) => {
  const viewport = page.getByTestId("course-map-viewport");
  await viewport.scrollIntoViewIfNeeded();
  await viewport.evaluate(node => { node.scrollLeft = 120; });
  const plato = page.locator('[data-node-id="plato"]');
  const before = await viewport.boundingBox();
  const scrollLeft = await viewport.evaluate(node => node.scrollLeft);
  await plato.click();
  const catalog = page.getByRole("dialog", { name: "Платон", exact: true });
  await expect(catalog).toBeVisible();
  for (const title of ["Программа обучения", "Диалоги и произведения", "Дополнительные материалы"]) {
    await expect(catalog.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await expect(catalog).toContainText("Содержание в разработке");
  await expect(catalog.getByRole("link")).toHaveCount(0);
  const mapBox = await viewport.boundingBox();
  const panelBox = await catalog.boundingBox();
  if (page.viewportSize()!.width >= 1000) {
    expect(mapBox!.width).toBeLessThan(before!.width * 0.6);
    expect(panelBox!.x).toBeGreaterThan(mapBox!.x + mapBox!.width);
    expect(panelBox!.width).toBeGreaterThan(before!.width * 0.4);
  } else {
    expect(panelBox!.width).toBeCloseTo(page.viewportSize()!.width, 0);
    expect(panelBox!.height).toBeCloseTo(page.viewportSize()!.height, 0);
  }
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="philosopher-catalog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(catalog).toHaveCount(0);
  await expect(plato).toBeFocused();
  expect(await viewport.evaluate(node => node.scrollLeft)).toBe(scrollLeft);
  await page.keyboard.press("Enter");
  await expect(catalog).toBeVisible();
  await catalog.getByRole("button", { name: "Закрыть каталог", exact: true }).click();
  await expect(catalog).toHaveCount(0);
  await expect(plato).toBeFocused();
  expect(await viewport.evaluate(node => node.scrollLeft)).toBe(scrollLeft);
  await expect(page).toHaveURL(/\/learn$/);
});

test("Plato followers is smaller, above the route, and opens an honest preview", async ({ page }) => {
  const viewport = page.getByTestId("course-map-viewport");
  await viewport.scrollIntoViewIfNeeded();
  const parent = page.locator('[data-node-id="plato"]');
  const branch = page.locator('[data-node-id="plato-followers"]');
  await expect(branch).toBeInViewport({ ratio: 1 });
  const parentBox = await parent.boundingBox(), branchBox = await branch.boundingBox();
  expect(branchBox!.width / parentBox!.width).toBeGreaterThanOrEqual(0.65);
  expect(branchBox!.width / parentBox!.width).toBeLessThanOrEqual(0.75);
  expect(branchBox!.y + branchBox!.height / 2).toBeLessThan(parentBox!.y);
  await expect(page.getByTestId("course-branch-route")).toHaveCount(1);
  const overlaps = await page.locator('[data-era-id="antiquity"]').evaluateAll(nodes => {
    const rects = nodes.flatMap(node => [node.getBoundingClientRect(), node.nextElementSibling!.getBoundingClientRect()]);
    const collisions: number[][] = [];
    for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) {
      const r = rects[a], s = rects[b];
      if (r.left < s.right && r.right > s.left && r.top < s.bottom && r.bottom > s.top) collisions.push([a, b]);
    }
    return collisions;
  });
  expect(overlaps).toEqual([]);
  await branch.click();
  const dialog = page.getByRole("dialog", { name: "Последователи Платона", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Содержание в разработке");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(branch).toBeFocused();
});

test("Plato's seven blocks expand independently and scroll while the header stays visible", async ({ page }) => {
  await page.locator('[data-node-id="plato"]').click();
  const catalog = page.getByRole("dialog", { name: "Платон", exact: true });
  const titles = ["Сократ и рождение философского вопроса", "Добродетель и правильная жизнь", "Познание и истина", "Душа и мир идей", "Справедливость и государство", "Бытие, небытие и диалектика", "Благо, счастье и философское наследие Платона"];
  await expect(catalog.getByTestId("catalog-block-title")).toHaveText(titles);
  for (const question of ["С чего начинается философия?", "Что значит быть хорошим человеком?", "Что мы можем знать?", "Что существует на самом деле?", "Как должно быть устроено общество?", "Как устроена реальность и как её мыслить?", "Как жить и чему нас научил Платон?"]) {
    await expect(catalog.getByText(question, { exact: true }).first()).toBeVisible();
  }
  await expect(catalog).toContainText("7 блоков · Основной курс");
  for (const title of titles) {
    const toggle = catalog.getByRole("button", { name: title, exact: true });
    await expect(toggle).toBeEnabled();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
  await expect(catalog.getByText("Уроки в разработке", { exact: true })).toHaveCount(5);
  await expect(catalog.getByRole("button", { name: "Что значит быть хорошим человеком?", exact: true })).toBeEnabled();
  await expect(catalog.getByRole("button", { name: "Кто такой Платон?", exact: true })).toBeEnabled();
  const first = catalog.getByRole("button", { name: titles[0], exact: true });
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await expect(catalog.getByRole("button", { name: titles[1], exact: true })).toHaveAttribute("aria-expanded", "true");
  await expect(catalog.getByRole("button", { name: "Кто такой Платон?", exact: true })).toBeHidden();
  const body = catalog.getByRole("region", { name: "Содержание каталога: Платон", exact: true });
  expect(await body.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  const close = catalog.getByRole("button", { name: "Закрыть каталог", exact: true });
  const before = await close.boundingBox();
  const pageScroll = await page.evaluate(() => scrollY);
  await body.hover();
  await page.mouse.wheel(0, 420);
  await expect.poll(() => body.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(pageScroll);
  expect((await close.boundingBox())!.y).toBe(before!.y);
  await body.focus();
  await page.keyboard.press("End");
  await expect.poll(() => body.evaluate(node => Math.abs(node.scrollHeight - node.clientHeight - node.scrollTop))).toBeLessThan(2);
  await expect(close).toBeInViewport();
  await expect(catalog.getByText("Дополнительные материалы", { exact: true })).toBeInViewport();
  await close.click();
  await expect(catalog).toHaveCount(0);
  await expect(page.locator('[data-node-id="plato"]')).toBeFocused();
});
