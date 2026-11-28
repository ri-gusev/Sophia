import { join } from "node:path";
import { test } from "@playwright/test";

export function accountTestSettings(project = test.info().project.name) {
  const basePort = Number(process.env.SOPHIA_TEST_PORT ?? "3000");
  if (!Number.isInteger(basePort) || basePort < 1 || basePort > 65533) throw new Error("SOPHIA_TEST_PORT must leave two adjacent TCP ports");
  const run = process.env.SOPHIA_PLAYWRIGHT_RUN;
  if (!run || !/^[a-z0-9-]+$/i.test(run)) throw new Error("Missing Playwright run identifier");
  const directory = join(process.cwd(), "artifacts", "playwright-accounts", run, project);
  const port = basePort + (project === "disabled-chat" ? 1 : project === "mobile" ? 2 : 0);
  return {
    port, origin: `http://127.0.0.1:${port}`, database: join(directory, "accounts.sqlite"), outbox: join(directory, "outbox.jsonl"),
  };
}
