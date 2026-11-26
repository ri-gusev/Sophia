import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [operation, directoryArgument, portArgument = '3469'] = process.argv.slice(2);
if (!['build', 'start'].includes(operation) || !directoryArgument || !/^\d+$/.test(portArgument)
  || Number(portArgument) < 1024 || Number(portArgument) > 65534) {
  throw new Error('Usage: node scripts/performance/run.mjs build|start <new-directory> [port]');
}

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = resolve(directoryArgument);
mkdirSync(directory, { recursive: true });
if (readdirSync(directory).length > 0) throw new Error('Choose an empty performance directory.');

const isBuild = operation === 'build';
const origin = `http://127.0.0.1:${portArgument}`;
const database = join(directory, 'accounts.sqlite');
const outbox = join(directory, 'outbox.jsonl');
const probe = new URL('./probe.mjs', import.meta.url).href;
const env = {
  ...process.env,
  NODE_OPTIONS: `--import ${probe}`,
  SOPHIA_PERF_DIRECTORY: directory,
  SOPHIA_PERF_KIND: isBuild ? 'build' : 'runtime',
  NEXT_TELEMETRY_DISABLED: '1',
  ACCOUNT_MODE: 'local',
  ACCOUNT_ORIGIN: origin,
  ACCOUNT_MAIL_TRANSPORT: 'test',
  ACCOUNT_DB_PATH: database,
  ACCOUNT_TEST_OUTBOX: outbox,
  AI_CHAT_ENABLED: 'false',
  CHAT_ACCESS_MODE: 'local',
  CHAT_ALLOWED_ORIGINS: origin,
  CHAT_LEDGER_PATH: join(directory, 'disabled-chat.sqlite'),
  OPENAI_API_KEY: ' ',
  SMTP_USER: '',
  SMTP_PASSWORD: '',
};

const command = isBuild ? (process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm') : process.execPath;
const args = isBuild ? (process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd run build'] : ['run', 'build'])
  : [join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '--hostname', '127.0.0.1', '--port', portArgument];
const startedAt = Date.now();
const child = spawn(command, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
const file = join(directory, isBuild ? 'build.json' : 'server.json');
const manifest = { origin, pid: child.pid, path: database, outbox, startedAt, transport: 'test' };
writeFileSync(file, JSON.stringify(manifest, null, 2));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
child.once('exit', (code, signal) => {
  writeFileSync(file, JSON.stringify({ ...manifest, endedAt: Date.now(), code, signal }, null, 2));
  process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1);
});
