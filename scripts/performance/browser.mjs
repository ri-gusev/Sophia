import { readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { readServerManifest } from './target.mjs';

const [manifestPath, fixturesPath, output] = process.argv.slice(2);
if (!manifestPath || !fixturesPath || !output) throw new Error('Use: node scripts/performance/browser.mjs <server.json> <fixtures.json> <new report.json>');
const manifest = await readServerManifest(manifestPath);
const [account] = JSON.parse(await readFile(fixturesPath, 'utf8'));
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ baseURL: manifest.origin, reducedMotion: 'reduce' });
const [name, value] = account.cookie.split('=');
await context.addCookies([{ name, value, url: manifest.origin }]);
const page = await context.newPage();
const errors = [];
const responses = [];
let cancelledRscRequests = 0;
page.on('pageerror', error => errors.push(error.message));
page.on('requestfailed', request => {
  const url = new URL(request.url());
  if (url.origin !== manifest.origin) return;
  const reason = request.failure()?.errorText;
  if (reason === 'net::ERR_ABORTED' && !request.isNavigationRequest() && url.searchParams.has('_rsc')) {
    cancelledRscRequests++;
  } else {
    errors.push(`${request.resourceType()} ${url.pathname}: ${reason}`);
  }
});
page.on('response', response => {
  if (new URL(response.url()).origin === manifest.origin) responses.push(response.status());
});
const startedAt = Date.now();
const stages = [];

async function measure(name, action) {
  const start = Date.now();
  const offset = responses.length;
  let error;
  try { await action(); } catch (failure) { error = failure.message; }
  const requests = responses.slice(offset);
  stages.push({ name, startedAt: start, endedAt: Date.now(), requests: requests.length,
    failedRequests: requests.filter(status => status >= 400).length, error });
}

try {
  await measure('daily-question', async () => {
    await page.goto('/');
    const quiz = page.getByRole('group', { name: 'Вопрос дня' });
    await quiz.getByRole('radio').first().check();
    await quiz.getByRole('button', { name: 'Проверить ответ' }).click();
    await expect(quiz.getByRole('status')).toContainText('Серия продлена');
  });
  await measure('lesson', async () => {
    await page.goto('/learn#lesson=plato-introduction&scene=journey');
    const lesson = page.getByTestId('lesson-introduction');
    await lesson.getByRole('button', { name: 'Начать путешествие' }).click();
    await expect(lesson.getByTestId('lesson-scene')).toHaveAttribute('data-scene-id', 'athens');
    await expect.poll(async () => {
      const response = await page.request.get('/api/progress');
      responses.push(response.status());
      return (await response.json()).progress?.lastOpened?.sceneId;
    }).toBe('athens');
  });
  await measure('atlas', async () => {
    await page.goto('/atlas');
    await expect(page.getByRole('status')).toHaveText('Глобус готов', { timeout: 30000 });
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await canvas.hover();
    const before = await canvas.screenshot();
    await page.mouse.down();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);
  });
  await measure('profile-calendar', async () => {
    await page.goto('/profile');
    await expect(page.getByText(account.displayName, { exact: true }).first()).toBeVisible();
    const calendar = page.getByRole('region', { name: 'Активность обучения' });
    await expect(calendar.locator('[data-date]')).toHaveCount(365);
  });
} finally {
  const endedAt = Date.now();
  await browser.close();
  await writeFile(output, JSON.stringify({ startedAt, endedAt, stages, errors, cancelledRscRequests }, null, 2), { flag: 'wx' });
}
if (errors.length || stages.some(stage => stage.error || stage.failedRequests)) process.exitCode = 1;
