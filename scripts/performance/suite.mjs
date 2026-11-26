import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';
import { readServerManifest } from './target.mjs';

const [server, fixtures] = process.argv.slice(2);
if (!server || !fixtures) throw new Error('Use: node scripts/performance/suite.mjs <server.json> <fixtures.json>');
const manifest = await readServerManifest(server);
const load = fileURLToPath(new URL('./load.mjs', import.meta.url));
const runtimeLog = join(dirname(server), `runtime-${manifest.pid}.jsonl`);
const stages = [
  ['smoke', 1, 10], ['mixed', 1, 120], ['mixed', 10, 300], ['mixed', 25, 300],
  ['mixed', 50, 300], ['mixed', 100, 600], ['mixed', 200, 600],
  ['mixed', 25, 1800], ['write', 50, 120], ['login', 25, 120],
];
await pause(Math.max(0, manifest.startedAt + 305_000 - Date.now()));
for (const [mode, users, seconds] of stages) {
  const output = join(dirname(server), `${mode}-${users}-${seconds}.json`);
  const args = [load, '--server', server, '--fixtures', fixtures, '--output', output,
    '--users', String(users), '--seconds', String(seconds), '--mode', mode];
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  if (code !== 0) throw new Error(`Stage stopped: ${mode}, ${users} VUs`);
  const { total, byPath, startedAt, endedAt } = JSON.parse(await readFile(output, 'utf8'));
  await pause(1500); // Include counters for requests in the last partial sampling interval.
  const log = await readFile(runtimeLog, 'utf8');
  const samples = log.slice(0, log.lastIndexOf('\n')).split('\n').map(line => JSON.parse(line));
  const before = samples.findLast(sample => sample.at <= startedAt);
  const during = samples.filter(sample => sample.at >= startedAt && sample.at <= endedAt);
  const after = samples.find(sample => sample.at >= endedAt);
  if (!before || !after) throw new Error(`Incomplete resource samples: ${mode}, ${users} VUs`);
  during.push(after);
  const sqliteBusy = after.sqliteBusy > before.sqliteBusy;
  const memoryPressure = during.some(({ cgroup }) => cgroup &&
    (cgroup.oomKills > (before?.cgroup?.oomKills ?? 0) || (cgroup.max && cgroup.current > cgroup.max * 0.95)));
  if ((total.errors + total.timeouts) / total.requests >= 0.01 || sqliteBusy || memoryPressure ||
      (byPath['/api/progress']?.p95 ?? 0) > 500 || (byPath['/api/account/register']?.p95 ?? 0) > 500 ||
      (byPath['/api/account/login']?.p95 ?? 0) > 1500 || (byPath['/api/account/verify']?.p95 ?? 0) > 1500) {
    throw new Error(`Stage exceeded acceptance thresholds: ${mode}, ${users} VUs`);
  }
  for (const [path, metrics] of Object.entries(byPath)) {
    if (metrics.requests && !metrics.ok && metrics.limited === metrics.requests) {
      console.warn(`${mode}, ${users} VUs: ${path} entirely rate limited; no successful latency sample.`);
    }
  }
}
