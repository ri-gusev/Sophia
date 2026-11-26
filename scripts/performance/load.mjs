import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { setTimeout as pause } from 'node:timers/promises';
import { registrationRevisions } from '../../src/features/legal/server/revisions.ts';
import { positiveInteger, readServerManifest } from './target.mjs';

const { values } = parseArgs({ options: {
  server: { type: 'string' }, fixtures: { type: 'string' }, output: { type: 'string' },
  users: { type: 'string', default: '1' }, seconds: { type: 'string', default: '120' },
  mode: { type: 'string', default: 'mixed' },
} });
const { server, fixtures, output, mode } = values;
if (!server || !fixtures || !output || !['mixed', 'login', 'write', 'smoke'].includes(mode)) {
  throw new Error('Use --server <server.json> --fixtures <fixtures.json> --output <new report.json> [--users 1] [--seconds 120] [--mode mixed|login|write|smoke].');
}
const users = positiveInteger(values.users, 'users', 200);
const seconds = positiveInteger(values.seconds, 'seconds', 1800);
const manifest = await readServerManifest(server);
const { origin } = manifest;
const accounts = JSON.parse(await readFile(fixtures, 'utf8'));
if (!Array.isArray(accounts) || accounts.length < users) throw new Error('Insufficient test fixtures.');
const legalVersions = Object.fromEntries(registrationRevisions().map(({ kind, version }) => [kind, version]));
const samples = [];
const actions = {};
const startedAt = Date.now();
const deadline = performance.now() + seconds * 1000;
let stopped = false;

async function request(path, account, { data, check, allow429 = false } = {}) {
  const start = performance.now();
  let result = 'error';
  let status;
  let retryAfter;
  try {
    const response = await fetch(new URL(path, origin), {
      method: data ? 'POST' : 'GET', redirect: 'manual', signal: AbortSignal.timeout(8000),
      headers: { origin, ...(account && { cookie: account.cookie }), ...(data && { 'content-type': 'application/json' }) },
      body: data && JSON.stringify(data),
    });
    status = response.status;
    const body = await response.text();
    if (status === 429 && allow429 && Number(response.headers.get('retry-after')) > 0 && JSON.parse(body).error) {
      result = 'limited';
      retryAfter = Number(response.headers.get('retry-after'));
    }
    if (response.ok && (check ? check(body, response) : /<html[\s>]/i.test(body) && body.includes('Sophia'))) result = 'ok';
  } catch (error) {
    if (error.name === 'TimeoutError') result = 'timeout';
  }
  samples.push({ path, status, result, retryAfter, ms: performance.now() - start });
  const recent = samples.slice(-50);
  if (recent.length >= 10 && recent.filter(row => ['error', 'timeout'].includes(row.result)).length >= 5) stopped = true;
  return result;
}

const lessonId = 'plato-introduction';
const writeTurns = new Map();
const progress = (account, check = body => body.accountId === account.accountId && Array.isArray(body.progress?.lessons)) =>
  request('/api/progress', account, { check: text => check(JSON.parse(text)) });

async function write(account) {
  const turn = writeTurns.get(account.accountId) ?? 0;
  writeTurns.set(account.accountId, turn + 1);
  const sceneId = turn % 2 ? 'socrates' : 'journey';
  const contains = body => body.accountId === account.accountId && body.progress?.lastOpened?.lessonId === lessonId
    && body.progress.lastOpened.sceneId === sceneId;
  await request('/api/progress', account, {
    data: { action: 'resume', expectedAccountId: account.accountId, lessonId, sceneId },
    check: text => contains(JSON.parse(text)),
  });
  await progress(account, contains);
}

function login(account) {
  return request('/api/account/login', undefined, {
    data: { email: account.email, password: account.password }, allow429: true,
    check: (text, response) => JSON.parse(text).ok === true && /^sophia-session=|^__Host-sophia-session=/.test(response.headers.get('set-cookie') ?? ''),
  });
}

async function register() {
  const email = `sophia-perf-${randomUUID().slice(0, 24)}@mail.ru`;
  const password = `Perf ${randomUUID()}`;
  const terms = { age: true, terms: true, consent: true, legalVersions };
  const result = await request('/api/account/register', undefined, {
    data: { email, displayName: 'Sophia performance', ...terms },
    allow429: true, check: text => JSON.parse(text).ok === true,
  });
  if (result !== 'ok') return;
  const outbox = await readFile(manifest.outbox, 'utf8');
  const mail = outbox.trim().split('\n').map(line => JSON.parse(line)).find(row => row.to === email && row.kind === 'verify');
  const token = mail && new URLSearchParams(new URL(mail.url).hash.slice(1)).get('token');
  await request('/api/account/verify', undefined, {
    data: { token, password, confirmPassword: password, ...terms },
    allow429: true, check: text => JSON.parse(text).ok === true,
  });
}

async function perform(name, account) {
  actions[name] = (actions[name] ?? 0) + 1;
  switch (name) {
    case 'home': await request('/', account); break;
    case 'map': await request('/learn', account); await request('/atlas', account); break;
    case 'lesson': await request('/learn', account); await progress(account); break;
    case 'profile': await request('/profile', account, { check: body => body.includes(account.displayName) }); await progress(account); break;
    case 'write': await write(account); break;
    case 'login': await login(account); break;
    case 'register': await register(); break;
  }
}

const mix = ['home', 'map', 'lesson', 'profile', 'write', 'home', 'map', 'lesson', 'profile', 'home',
  'lesson', 'map', 'write', 'home', 'lesson', 'profile', 'map', 'home', 'lesson', 'login'];
if (mode === 'smoke') {
  for (const action of ['home', 'map', 'lesson', 'profile', 'write', 'login', 'register']) await perform(action, accounts[0]);
} else {
  await Promise.all(accounts.slice(0, users).map(async (account, index) => {
    await pause(mode === 'mixed' ? Math.random() * 2000 : 0);
    let turn = index % mix.length;
    let authTurn = index;
    while (!stopped && performance.now() < deadline) {
      let action = mode;
      if (mode === 'mixed') {
        action = mix[turn++ % mix.length];
        if (action === 'login' && authTurn++ % 2) action = 'register';
      }
      await perform(action, account);
      await pause(mode === 'mixed' ? 3000 + Math.random() * 5000 : 300 + Math.random() * 700);
    }
  }));
}

const endedAt = Date.now();
function summarize(rows) {
  const times = rows.filter(row => row.result === 'ok').map(row => row.ms).sort((a, b) => a - b);
  const pct = n => times[Math.ceil(times.length * n) - 1] ?? null;
  return {
    requests: rows.length, ok: times.length, limited: rows.filter(row => row.result === 'limited').length,
    retryAfter2Seconds: rows.filter(row => row.retryAfter === 2).length,
    errors: rows.filter(row => row.result === 'error').length, timeouts: rows.filter(row => row.result === 'timeout').length,
    mean: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
    p50: pct(0.50), p95: pct(0.95), p99: pct(0.99),
    statuses: Object.fromEntries([...new Set(rows.map(row => row.status ?? 'none'))].map(status =>
      [status, rows.filter(row => (row.status ?? 'none') === status).length])),
  };
}
const paths = [...new Set(samples.map(row => row.path))];
const report = {
  mode, users, seconds, startedAt, endedAt, stopped, actions, rps: samples.length * 1000 / Math.max(endedAt - startedAt, 1),
  total: summarize(samples), byPath: Object.fromEntries(paths.map(path => [path, summarize(samples.filter(row => row.path === path))])),
};
await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ mode, users, stopped, rps: report.rps, ...report.total }));
if (stopped || (mode === 'smoke' && (report.total.errors || report.total.timeouts || report.total.limited))) process.exitCode = 1;
