import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("workshop free question, hint, example, editing and skip", async ({ page }, info) => {
  await page.goto("/learn#lesson=plato-socratic-question&scene=courage-question");
  const scene = page.getByTestId("workshop-scene");
  await expect(scene).toContainText("Смелый человек — тот, кто ничего не боится");
  await expect.poll(() => scene.locator("img").evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await scene.screenshot({ animations:"disabled", path:info.outputPath("01-athenian.png"), style:".site-header,.skip-link{visibility:hidden!important}" });
  for (let i = 1; i < 3; i++) { await page.waitForTimeout(450); await scene.getByRole("button", { name:"Далее", exact:true }).click(); await scene.screenshot({ animations:"disabled", path:info.outputPath(`0${i+1}-socrates.png`), style:".site-header,.skip-link{visibility:hidden!important}" }); }
  const input = scene.getByRole("textbox");
  await expect(scene.getByRole("button", { name:"Сравнить с вопросом Сократа", exact:true })).toBeDisabled();
  await input.fill("   ");
  await expect(scene.getByRole("button", { name:"Не знаю — покажи пример" })).toBeVisible();
  await scene.getByRole("button", { name:"Получить подсказку" }).click();
  await expect(scene).toContainText("боится войти в горящий дом");
  await expect(input).toHaveValue("   ");
  await input.fill("Разве страх мешает быть смелым?");
  await scene.screenshot({ animations:"disabled", path:info.outputPath("question.png"), style:".site-header,.skip-link{visibility:hidden!important}" });
  await scene.getByRole("button", { name:"Сравнить с вопросом Сократа", exact:true }).click();
  await expect(scene).toContainText("Вопрос Сократа");
  await expect(scene).toContainText("После проверки");
  await expect(scene).not.toContainText("Правильный ответ");
  await scene.screenshot({ animations:"disabled", path:info.outputPath("example.png"), style:".site-header,.skip-link{visibility:hidden!important}" });
  expect((await new AxeBuilder({page}).include('[data-testid="workshop-scene"]').withTags(["wcag2a","wcag2aa"]).analyze()).violations).toEqual([]);
  await scene.getByRole("button", { name:"Изменить свой вопрос" }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("Разве страх мешает быть смелым?");
  await input.fill("");
  await scene.getByRole("button", { name:"Не знаю — покажи пример" }).click();
  for (const width of [390,768,1024,1440]) { await page.setViewportSize({width,height:1000}); await scene.screenshot({ animations:"disabled",path:info.outputPath(`${width}.png`),style:".site-header,.skip-link{visibility:hidden!important}" }); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); }
  await scene.getByRole("button", {name:"Повторить задание"}).click();
  await expect(scene.getByRole("textbox")).toHaveCount(0);
  await expect(scene).toContainText("Смелый человек — тот, кто ничего не боится");
  await scene.getByRole("button", {name:"К предыдущему слайду"}).click();
  const practice=page.getByTestId("practice-scene");
  for(let i=1;i<3;i++){await page.waitForTimeout(450);await practice.getByRole("button",{name:"Далее",exact:true}).click();}
  await practice.getByRole("radio",{name:"Нет. Даже умный человек иногда ошибается"}).check();
  await practice.getByRole("button",{name:"Проверить",exact:true}).click();
  await practice.getByRole("button",{name:"Продолжить урок"}).click();
  await expect(scene).toBeVisible();
});
