import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const [directory] = process.argv.slice(2);
if (!directory) throw new Error('Use: node scripts/performance/metrics.mjs <measurement-directory>');
const files = await readdir(directory);
const parse = async file => JSON.parse(await readFile(join(directory, file), 'utf8'));
const loadSamples = async kind => (await Promise.all(files.filter(file => file.startsWith(`${kind}-`) && file.endsWith('.jsonl')).map(async file =>
  (await readFile(join(directory, file), 'utf8')).trim().split('\n').map(line => JSON.parse(line)),
))).flat().sort((a, b) => a.at - b.at);

function metric(rows, key, scale = 1) {
  const values = rows.map(row => row[key]).filter(Number.isFinite);
  const round = value => Math.round(value / scale * 100) / 100;
  return values.length ? { mean: round(values.reduce((sum, n) => sum + n, 0) / values.length), max: round(Math.max(...values)) } : null;
}

function resources(rows, initial, final) {
  const mib = 1024 ** 2;
  const cgroup = rows.filter(row => row.cgroup).map(row => row.cgroup);
  return {
    samples: rows.length, rssMiB: metric(rows, 'rss', mib), heapUsedMiB: metric(rows, 'heapUsed', mib),
    heapTotalMiB: metric(rows, 'heapTotal', mib), externalMiB: metric(rows, 'external', mib),
    cpuCorePercent: metric(rows, 'cpuCorePercent'), hostCpuPercent: metric(rows, 'hostCpuPercent'),
    eventLoopP95Ms: metric(rows, 'eventLoopP95Ms'), eventLoopMaxMs: metric(rows, 'eventLoopMaxMs'),
    hostFreeMiB: metric(rows, 'hostFreeBytes', mib),
    firstRssMiB: rows.length ? rows[0].rss / mib : null,
    lastRssMiB: rows.length ? rows.at(-1).rss / mib : null,
    sqliteBusy: initial && final ? final.sqliteBusy - initial.sqliteBusy : null,
    oomKills: initial?.cgroup && final?.cgroup ? final.cgroup.oomKills - initial.cgroup.oomKills : null,
    cgroupMemoryMiB: metric(cgroup, 'current', mib), cgroupSwapMiB: metric(cgroup, 'swap', mib),
    cgroupLimitMiB: cgroup.at(-1)?.max ? cgroup.at(-1).max / mib : null,
    pidCount: new Set(rows.map(row => row.pid)).size,
  };
}

if (files.includes('build.json')) {
  const build = await parse('build.json');
  const rows = await loadSamples('build');
  // Each PID has its own record stream. Sum its latest observed RSS until the process exits.
  const active = new Map();
  let peakRss = 0;
  for (const row of rows) {
    if (row.event === 'exit') active.delete(row.pid);
    else active.set(row.pid, row.rss);
    peakRss = Math.max(peakRss, [...active.values()].reduce((sum, rss) => sum + rss, 0));
  }
  console.log(JSON.stringify({ buildSeconds: (build.endedAt - build.startedAt) / 1000, exitCode: build.code,
    sampledPeakSumRssMiB: peakRss / 1024 ** 2, perProcessSamples: resources(rows) }, null, 2));
} else {
  const server = await parse('server.json');
  const rows = (await loadSamples('runtime')).filter(row => row.pid === server.pid);
  const windows = [];
  for (const file of files.filter(file => /^(mixed|smoke|write|login|browser)-.*\.json$/.test(file))) {
    const { startedAt, endedAt, stages, ...result } = await parse(file);
    const windowResources = (start, end) => resources(
      rows.filter(row => row.at >= start && row.at <= end), rows.findLast(row => row.at <= start), rows.find(row => row.at >= end),
    );
    windows.push({
      file, startedAt, endedAt, ...result, resources: windowResources(startedAt, endedAt),
      ...(stages && { stages: stages.map(stage => ({ ...stage, resources: windowResources(stage.startedAt, stage.endedAt) })) }),
      ...(endedAt - startedAt >= 1800_000 && {
        earlySteady: windowResources(startedAt + 300_000, startedAt + 600_000),
        lateSteady: windowResources(endedAt - 300_000, endedAt),
      }),
    });
  }
  console.log(JSON.stringify({ pid: server.pid, endedAt: server.endedAt, exitCode: server.code,
    firstSecond: rows.find(row => row.uptime >= 1), fifthMinute: rows.find(row => row.uptime >= 300),
    windows: windows.sort((a, b) => a.startedAt - b.startedAt) }, null, 2));
}
