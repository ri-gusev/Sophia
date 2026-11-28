import { defineConfig, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { accountTestSettings } from "./tests/support/account-test-settings";

process.env.SOPHIA_PLAYWRIGHT_RUN ??= randomUUID();
const desktop = accountTestSettings("desktop");
const mobile = accountTestSettings("mobile");
const disabledChat = accountTestSettings("disabled-chat");

function testServer({ port, origin, database, outbox }: ReturnType<typeof accountTestSettings>, aiChatEnabled: "true" | "false") {
  return {
    command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`,
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
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], baseURL: desktop.origin } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", baseURL: mobile.origin } },
  ],
  webServer: [testServer(desktop, "true"), testServer(mobile, "true"), testServer(disabledChat, "false")],
});
