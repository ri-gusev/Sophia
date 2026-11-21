import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { INTRO_LESSONS } from '../src/features/course-lesson/lesson-data';

const url = '/learn#lesson=plato-virtue-definition&scene=virtue-swarm';
async function openGarden(scene: Locator) {
  await scene.getByRole('button', { name: 'Далее', exact: true }).click();
  await scene.getByRole('button', { name: 'Далее', exact: true }).click();
  await scene.getByRole('button', { name: 'Посмотреть на рой' }).click();
}
async function explore(scene: Locator) {
  await scene.getByRole('button', { name: 'Исследовать рой' }).click();
  await scene.getByRole('button', { name: 'Чем отличаются?', exact: true }).click();
  await scene.getByRole('button', { name: 'Что их объединяет?', exact: true }).click();
}

test('exactly five slides', () => {
  expect(INTRO_LESSONS['plato-virtue-definition'].scenes.map(scene => scene.id)).toEqual(['meno-question', 'virtue-many-faces', 'virtue-swarm', 'virtue-definition-practice', 'virtue-lesson-finale']);
});

test('swarm exploration, previous steps, retry and replay', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  const scene = page.getByTestId('virtue-swarm-scene');
  const shot = (name: string) => scene.screenshot({ path: info.outputPath(name), animations: 'disabled', style: '.site-header { visibility: hidden; }' });
  await expect(page.getByText('Слайд 3 из 5')).toBeVisible();
  await expect(scene.getByText('Менон, я попросил', { exact: false })).toBeVisible();
  await shot('01-intro.png');
  await openGarden(scene);
  await expect(scene.locator('[data-bee]')).toHaveCount(6);
  await shot('02-garden.png');
  await scene.getByRole('button', { name: 'Приостановить движение' }).click();
  await expect(scene.getByTestId('swarm-garden')).toHaveAttribute('data-paused', 'true');
  await scene.getByRole('button', { name: 'Исследовать рой' }).click();
  const bridge = scene.getByRole('button', { name: 'А при чём здесь добродетель?' });
  await expect(bridge).toBeDisabled();
  const differences = scene.getByRole('button', { name: 'Чем отличаются?', exact: true });
  await differences.focus(); await differences.press('Enter');
  await expect(differences).toBeFocused();
  await expect(differences).toHaveAttribute('aria-pressed', 'true');
  await expect(scene.getByText('Крупнее', { exact: true })).toBeVisible();
  await expect(bridge).toBeDisabled();
  await shot('03-differences.png');
  await scene.getByRole('button', { name: 'Что их объединяет?', exact: true }).click();
  await expect(scene.getByText('Крупнее', { exact: true })).not.toBeVisible();
  await expect(scene.getByText('Что делает всех их пчёлами?', { exact: true })).toBeVisible();
  await shot('04-common.png');
  await differences.click();
  await expect(scene.getByRole('status')).toHaveText('Исследовано: 2 из 2 способов');
  await bridge.click();
  await shot('05-bridge.png');
  await scene.getByRole('button', { name: 'Далее', exact: true }).click();
  await scene.getByRole('button', { name: 'Попробовать самому' }).click();
  await shot('06-practice.png');
  await scene.getByRole('button', { name: 'Сколько всего существует добродетелей?' }).click();
  await expect(scene.getByRole('status')).toContainText('Это тоже может быть интересным');
  await expect(scene.getByRole('button', { name: 'Открыть общую мысль' })).toHaveCount(0);
  await scene.getByRole('button', { name: 'Что общего у всех добродетелей?' }).click();
  await expect(scene.getByRole('status')).toContainText('Именно!');
  await shot('07-correct.png');
  const previous = scene.getByRole('button', { name: 'Назад', exact: true });
  await previous.click();
  await expect(scene.getByRole('status')).toHaveCount(0);
  await previous.click();
  await expect(scene.getByRole('button', { name: 'Попробовать самому' })).toBeVisible();
  await page.reload();
  await expect(scene.getByRole('button', { name: 'Попробовать самому' })).toBeVisible();
  await scene.getByRole('button', { name: 'Попробовать самому' }).click();
  await scene.getByRole('button', { name: 'Что общего у всех добродетелей?' }).click();
  await scene.getByRole('button', { name: 'Открыть общую мысль' }).click();
  await expect(scene.getByRole('heading', { name: 'Множество пчёл — один вопрос об их природе' })).toBeVisible();
  await shot('08-bee-parallel.png');
  await scene.getByRole('button', { name: 'А добродетели?' }).click();
  await expect(scene.getByText('Мысль урока · Sophia')).toBeVisible();
  await shot('09-final.png');
  await previous.click();
  await expect(scene.getByRole('button', { name: 'А добродетели?' })).toBeVisible();
  await previous.click();
  await expect(scene.getByRole('status')).toContainText('Именно!');
  expect(await page.evaluate(() => localStorage.getItem('sophia.lesson-completions.v1'))).toBeNull();
  await expect(page.getByRole('progressbar', { name: 'Прогресс урока' })).toHaveCount(0);
  await scene.getByRole('button', { name: 'Повторить сцену' }).click();
  await openGarden(scene); await scene.getByRole('button', { name: 'Исследовать рой' }).click();
  await expect(scene.getByRole('status')).toHaveText('Исследовано: 0 из 2 способов');
  await expect(bridge).toBeDisabled();
  expect(errors).toEqual([]);
  await scene.getByRole('button', { name: 'Вернуться в каталог' }).click();
  await expect(page.getByTestId('philosopher-catalog')).toBeVisible();
});

test('leaving slide three backwards allows another full pass from its first line', async ({ page }) => {
  await page.goto(url);
  const swarm = page.getByTestId('virtue-swarm-scene');
  const gallery = page.getByTestId('virtue-gallery-scene');
  const previousSlide = swarm.getByRole('button', { name: 'К предыдущему' });
  await previousSlide.click();
  await gallery.getByRole('button', { name: 'Посмотреть примеры' }).click();
  for (const name of ['Управлять городом', 'Заботиться о доме', 'Поступать достойно в своём возрасте']) await gallery.getByRole('button', { name }).click();
  await gallery.getByRole('button', { name: 'Что скажет Сократ?' }).click();
  await gallery.getByRole('button', { name: 'Далее', exact: true }).click();
  await gallery.getByRole('button', { name: 'Открыть объяснение' }).click();
  const nextSlide = gallery.getByRole('button', { name: 'Продолжить урок' });
  await nextSlide.click();
  await openGarden(swarm);
  await explore(swarm);
  await previousSlide.click();
  await expect(nextSlide).toBeVisible();
  await page.reload();
  await nextSlide.click();
  await expect(swarm.getByText('Менон, я попросил', { exact: false })).toBeVisible();
  await expect(swarm.getByRole('button', { name: 'Назад', exact: true })).toBeDisabled();
  await openGarden(swarm);
  await swarm.getByRole('button', { name: 'Исследовать рой' }).click();
  await expect(swarm.getByRole('status')).toHaveText('Исследовано: 0 из 2 способов');
});

for (const width of [390, 768, 1024, 1440]) test(`swarm ${width}px reduced motion and accessibility`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  const scene = page.getByTestId('virtue-swarm-scene');
  await openGarden(scene); await explore(scene);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await scene.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  expect((await new AxeBuilder({ page }).include('[data-testid="virtue-swarm-scene"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await scene.screenshot({ path: info.outputPath(`swarm-${width}.png`), style: '.site-header { visibility: hidden; }' });
});
