import {test,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const key="sophia.lesson-progress.v2:finished:plato-socratic-question";
test('five slides form one journey and preserve the question on return', async ({ page }) => {
 await page.goto('/learn#lesson=plato-socratic-question&scene=cephalus');
 const lesson = page.getByTestId('lesson-introduction');
 const dialogue = page.getByTestId('dialogue-scene');
 await expect(lesson).toContainText('Шаг 1 из 5');
 for (let i = 1; i < 8; i++) { await page.waitForTimeout(450); await dialogue.getByRole('button', { name: 'Далее', exact: true }).click(); }
 await dialogue.getByRole('button', { name: 'Разобрать разговор' }).click();
 await dialogue.getByRole('button', { name: 'Продолжить урок' }).click();
 const mentor = page.getByTestId('mentor-scene');
 await expect(lesson).toContainText('Шаг 2 из 5');
 for (let i = 1; i < 6; i++) { await page.waitForTimeout(450); await mentor.getByRole('button', { name: 'Далее', exact: true }).click(); }
 await mentor.getByRole('button', { name: 'Продолжить урок' }).click();
 const practice = page.getByTestId('practice-scene');
 await expect(lesson).toContainText('Шаг 3 из 5');
 for (let i = 1; i < 3; i++) { await page.waitForTimeout(450); await practice.getByRole('button', { name: 'Далее', exact: true }).click(); }
 await practice.getByRole('radio', { name: 'Нет. Даже умный человек иногда ошибается' }).check();
 await practice.getByRole('button', { name: 'Проверить', exact: true }).click();
 await practice.getByRole('button', { name: 'Продолжить урок' }).click();
 const workshop = page.getByTestId('workshop-scene');
 await expect(lesson).toContainText('Шаг 4 из 5');
 for (let i = 1; i < 3; i++) { await page.waitForTimeout(450); await workshop.getByRole('button', { name: 'Далее', exact: true }).click(); }
 await expect(workshop).not.toContainText('боится войти в горящий дом');
 await workshop.getByRole('textbox').fill('Что ты понимаешь под смелостью?');
 await workshop.getByRole('button', { name: 'Сравнить с вопросом Сократа', exact: true }).click();
 await workshop.getByRole('button', { name: 'Продолжить урок' }).click();
 const reflection = page.getByTestId('reflection-scene');
 await expect(lesson).toContainText('Шаг 5 из 5');
 await reflection.getByRole('button', { name: 'К предыдущему слайду' }).click();
 await expect(workshop.getByRole('textbox')).toHaveValue('Что ты понимаешь под смелостью?');
 await expect(workshop.getByRole('heading', { name: 'Твой вопрос', exact: true })).toBeVisible();
 await workshop.getByRole('button', { name: 'К предыдущему слайду' }).click();
 await expect(practice.getByRole('radio', { name: 'Нет. Даже умный человек иногда ошибается' })).toBeChecked();
 await expect(practice.getByRole('button', { name: 'Проверить', exact: true })).toBeDisabled();
 await practice.getByRole('button', { name: 'Продолжить урок' }).click();
 await workshop.getByRole('button', { name: 'Продолжить урок' }).click();
 for (let i = 1; i < 3; i++) { await page.waitForTimeout(450); await reflection.getByRole('button', { name: 'Далее', exact: true }).click(); }
 await reflection.getByRole('button', { name: 'Посмотреть итоги' }).click();
 await reflection.getByRole('button', { name: 'Завершить урок', exact: true }).click();
 expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe("1");
});
test("reflection explicitly saves completion, persists and returns to catalog",async({page},info)=>{
 await page.goto('/learn#lesson=plato-socratic-question&scene=courage-question');
 await page.evaluate(() => {
   for (const slide of ["cephalus", "socratic-questions", "always-true"]) {
     localStorage.setItem(`sophia.lesson-progress.v2:slide:plato-socratic-question:${slide}`, "1");
   }
 });
 const workshop=page.getByTestId('workshop-scene');
 for(let i=1;i<3;i++){await page.waitForTimeout(450);await workshop.getByRole('button',{name:'Далее',exact:true}).click();}
 await workshop.getByRole('button',{name:'Не знаю — покажи пример'}).click();
 await workshop.getByRole('button',{name:'Продолжить урок'}).click();
 const scene=page.getByTestId('reflection-scene');
 await expect(scene).toContainText('Сегодня ты увидел');
 await scene.screenshot({animations:'disabled',path:info.outputPath('first.png'),style:'.site-header,.skip-link{visibility:hidden!important}'});
 await expect(scene.getByRole('heading',{name:'Чему ты научился?'})).toHaveCount(0);
 await scene.getByRole('button',{name:'Далее',exact:true}).click();
 await scene.getByRole('button',{name:'Назад',exact:true}).click();
 await expect(scene).toContainText('Сегодня ты увидел');
 for(let i=1;i<3;i++){await page.waitForTimeout(450);await scene.getByRole('button',{name:'Далее',exact:true}).click();}
 await scene.screenshot({animations:'disabled',path:info.outputPath('third.png'),style:'.site-header,.skip-link{visibility:hidden!important}'});
 await expect(scene.getByRole('button',{name:'Завершить урок',exact:true})).toHaveCount(0);
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
 await scene.getByRole('button',{name:'Посмотреть итоги'}).click();
 await expect(scene.getByRole('heading',{name:'Чему ты научился?'})).toBeVisible();
 await expect(scene).toContainText('Мысль урока · София');
 await expect(scene).toContainText('Уточнять, что человек имеет в виду, и проверять его утверждения');
 await page.waitForTimeout(500);
 expect((await new AxeBuilder({page}).include('[data-testid="reflection-scene"]').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
 for(const width of [390,768,1024,1440]){await page.setViewportSize({width,height:1000});await scene.screenshot({animations:'disabled',path:info.outputPath(`${width}-summary.png`),style:'.site-header,.skip-link{visibility:hidden!important}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await scene.getByRole('button',{name:'Завершить урок',exact:true}).click();
 await expect(scene).toHaveCount(0);
 await page.getByRole('button',{name:'Сократ и рождение философского вопроса',exact:true}).click();
 await expect(page.getByTestId('philosopher-catalog')).toContainText('Пройдено');
 await page.getByTestId('philosopher-catalog').screenshot({path:info.outputPath('catalog.png')});
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe("1");
 await page.goto('/learn#lesson=plato-socratic-question&scene=first-step'); await page.reload();
 await expect(scene.getByRole('heading',{name:'Чему ты научился?'})).toBeVisible();
 await scene.getByRole('button',{name:'Повторить речь'}).click();
 for(let i=1;i<3;i++){await page.waitForTimeout(450);await scene.getByRole('button',{name:'Далее',exact:true}).click();}
 await scene.getByRole('button',{name:'Посмотреть итоги'}).click();
 await scene.getByRole('button',{name:'Завершить урок',exact:true}).click();
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe("1");
});
test('storage error does not claim completion',async({page})=>{
 await page.addInitScript(()=>{
   for (const slide of ["cephalus", "socratic-questions", "always-true", "courage-question"]) {
     localStorage.setItem(`sophia.lesson-progress.v2:slide:plato-socratic-question:${slide}`, "1");
   }
   Storage.prototype.setItem=()=>{throw new Error('blocked');};
 });
 await page.goto('/learn#lesson=plato-socratic-question&scene=first-step');
 const scene=page.getByTestId('reflection-scene');
 for(let i=1;i<3;i++){await page.waitForTimeout(450);await scene.getByRole('button',{name:'Далее',exact:true}).click();}
 await scene.getByRole('button',{name:'Посмотреть итоги'}).click();
 await scene.getByRole('button',{name:'Завершить урок',exact:true}).click();
 await expect(scene.getByRole('alert')).toContainText('Не удалось сохранить');
 await expect(scene).toBeVisible();
});
