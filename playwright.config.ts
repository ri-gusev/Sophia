import { defineConfig, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { accountTestSettings } from "./tests/support/account-test-settings";

process.env.SOPHIA_PLAYWRIGHT_RUN ??= randomUUID();
const { port, origin, database, outbox, disabledChatPort, disabledChatOrigin } = accountTestSettings();

function testServer(port: number, origin: string, aiChatEnabled: "true" | "false") {
  return {
    command: `${process.platform === "win32" ? "npm.cmd" : "npm"} run start -- --port ${port}`,
    url: origin,
    env: {
      ACCOUNT_MODE: "local",
      ACCOUNT_ORIGIN: origin,
      ACCOUNT_DB_PATH: database,
      ACCOUNT_MAIL_TRANSPORT: "test",
      ACCOUNT_TEST_OUTBOX: outbox,
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      AI_CHAT_ENABLED: aiChatEnabled,
      CHAT_ACCESS_MODE: "local",
      CHAT_ALLOWED_ORIGINS: origin,
      CHAT_LEDGER_PATH: join(process.cwd(), "artifacts", "playwright-ledgers", `${port}-${process.pid}.sqlite`),
      OPENAI_API_KEY: " ",
    },
    reuseExistingServer: false,
    timeout: 60_000,
  };
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: { baseURL: origin, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: [testServer(port, origin, "true"), testServer(disabledChatPort, disabledChatOrigin, "false")],
});
