import {test,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const key="sophia.lesson-completions.v1";
test("reflection explicitly saves completion, persists and returns to catalog",async({page},info)=>{
 await page.goto('/learn#lesson=plato-socratic-question&scene=courage-question');
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
 await expect(scene).toContainText('Мысль урока · Sophia');
 await page.waitForTimeout(500);
 expect((await new AxeBuilder({page}).include('[data-testid="reflection-scene"]').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
 for(const width of [390,768,1024,1440]){await page.setViewportSize({width,height:1000});await scene.screenshot({animations:'disabled',path:info.outputPath(`${width}-summary.png`),style:'.site-header,.skip-link{visibility:hidden!important}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await scene.getByRole('button',{name:'Завершить урок',exact:true}).click();
 await expect(scene).toHaveCount(0);
 await page.getByRole('button',{name:'Сократ и рождение философского вопроса',exact:true}).click();
 await expect(page.getByTestId('philosopher-catalog')).toContainText('Пройдено (в этом браузере)');
 await page.getByTestId('philosopher-catalog').screenshot({path:info.outputPath('catalog.png')});
 expect(JSON.parse((await page.evaluate(k=>localStorage.getItem(k),key))!)).toEqual(['plato-socratic-question']);
 await page.goto('/learn#lesson=plato-socratic-question&scene=first-step'); await page.reload();
 for(let i=1;i<3;i++){await page.waitForTimeout(450);await scene.getByRole('button',{name:'Далее',exact:true}).click();}
 await scene.getByRole('button',{name:'Посмотреть итоги'}).click();
 await scene.getByRole('button',{name:'Завершить урок',exact:true}).click();
 expect(JSON.parse((await page.evaluate(k=>localStorage.getItem(k),key))!)).toEqual(['plato-socratic-question']);
});
test('storage error does not claim completion',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('blocked');};});
 await page.goto('/learn#lesson=plato-socratic-question&scene=first-step'); await page.reload();
 const scene=page.getByTestId('reflection-scene');
 for(let i=1;i<3;i++){await page.waitForTimeout(450);await scene.getByRole('button',{name:'Далее',exact:true}).click();}
 await scene.getByRole('button',{name:'Посмотреть итоги'}).click();
 await scene.getByRole('button',{name:'Завершить урок',exact:true}).click();
 await expect(scene.getByRole('alert')).toContainText('Не удалось сохранить');
 await expect(scene).toBeVisible();
});
