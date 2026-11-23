import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

const testPort = Number(process.env.SOPHIA_TEST_PORT ?? "3000");
if (!Number.isInteger(testPort) || testPort < 1 || testPort > 65535) throw new Error("SOPHIA_TEST_PORT must be a valid TCP port");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${testPort}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: `npm.cmd run start -- --port ${testPort}`,
    url: `http://127.0.0.1:${testPort}`,
    env: {
      CHAT_ACCESS_MODE: "local",
      CHAT_ALLOWED_ORIGINS: `http://127.0.0.1:${testPort}`,
      CHAT_LEDGER_PATH: join(process.cwd(), "artifacts", "playwright-ledgers", `${testPort}-${process.pid}.sqlite`),
      OPENAI_API_KEY: " ",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
