import { appendFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { isMainThread } from 'node:worker_threads';

if (isMainThread && process.env.SOPHIA_PERF_DIRECTORY) {
  const kind = process.env.SOPHIA_PERF_KIND;
  const requestedInterval = Number(process.env.SOPHIA_PERF_SAMPLE_MS);
  const interval = Number.isInteger(requestedInterval) && requestedInterval >= 100 && requestedInterval <= 1000
    ? requestedInterval : 1000;
  const file = join(process.env.SOPHIA_PERF_DIRECTORY, `${kind}-${process.pid}.jsonl`);
  const delay = monitorEventLoopDelay({ resolution: 10 });
  let previousCpu = process.cpuUsage();
  let previousTime = process.hrtime.bigint();
  let previousHost = hostTimes();
  let sqliteBusy = 0;

  if (kind === 'runtime') {
    const { DatabaseSync, StatementSync } = await import('node:sqlite');
    for (const [prototype, methods] of [
      [DatabaseSync.prototype, ['exec', 'prepare']],
      [StatementSync.prototype, ['all', 'get', 'run']],
    ]) {
      for (const method of methods) {
        const original = prototype[method];
        prototype[method] = function (...args) {
          try { return original.apply(this, args); }
          catch (error) {
            if (error?.code === 'ERR_SQLITE_ERROR' && (error.errcode & 255) === 5) sqliteBusy++;
            throw error;
          }
        };
      }
    }
  }

  function hostTimes() {
    return os.cpus().reduce(([total, idle], { times }) => [
      total + Object.values(times).reduce((sum, value) => sum + value, 0), idle + times.idle,
    ], [0, 0]);
  }

  function cgroupMemory() {
    if (process.platform !== 'linux') return undefined;
    try {
      const relative = readFileSync('/proc/self/cgroup', 'utf8').match(/^0::(.*)$/m)?.[1];
      if (!relative) return undefined;
      const location = join('/sys/fs/cgroup', relative);
      const read = field => Number(readFileSync(join(location, field), 'utf8').trim());
      const events = Object.fromEntries(readFileSync(join(location, 'memory.events'), 'utf8').trim().split('\n')
        .map(line => line.split(' ')).map(([name, value]) => [name, Number(value)]));
      return { current: read('memory.current'), max: read('memory.max'), swap: read('memory.swap.current'), oomKills: events.oom_kill };
    } catch { return undefined; }
  }

  function sample(event) {
    const at = Date.now();
    const time = process.hrtime.bigint();
    const cpu = process.cpuUsage();
    const host = hostTimes();
    const elapsedUs = Number(time - previousTime) / 1_000;
    const hostElapsed = host[0] - previousHost[0];
    appendFileSync(file, JSON.stringify({
      at, event, pid: process.pid, ppid: process.ppid, uptime: process.uptime(), ...process.memoryUsage(),
      cpuCorePercent: elapsedUs >= 100_000 ? (cpu.user + cpu.system - previousCpu.user - previousCpu.system) * 100 / elapsedUs : null,
      hostCpuPercent: hostElapsed > 0 ? (1 - (host[1] - previousHost[1]) / hostElapsed) * 100 : null,
      hostFreeBytes: os.freemem(),
      eventLoopP95Ms: delay.count ? delay.percentile(95) / 1_000_000 : null,
      eventLoopMaxMs: delay.count ? delay.max / 1_000_000 : null,
      sqliteBusy, cgroup: cgroupMemory(),
    }) + '\n');
    previousCpu = cpu;
    previousTime = time;
    previousHost = host;
    delay.reset();
  }

  sample('start');
  delay.enable();
  setInterval(() => sample('sample'), interval).unref();
  process.on('exit', () => sample('exit'));
}
