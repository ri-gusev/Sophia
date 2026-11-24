import { join } from "node:path";

export function accountTestSettings() {
  const port = Number(process.env.SOPHIA_TEST_PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SOPHIA_TEST_PORT must be a valid TCP port");
  const run = process.env.SOPHIA_PLAYWRIGHT_RUN;
  if (!run || !/^[a-z0-9-]+$/i.test(run)) throw new Error("Missing Playwright run identifier");
  const directory = join(process.cwd(), "artifacts", "playwright-accounts", run);
  return { port, origin: `http://127.0.0.1:${port}`, database: join(directory, "accounts.sqlite"), outbox: join(directory, "outbox.jsonl") };
}
