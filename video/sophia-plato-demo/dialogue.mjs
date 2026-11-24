import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

export const directory = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../", import.meta.url));
const address = "127.0.0.1";
const port = Number(process.env.SOPHIA_DEMO_PORT ?? 3395);
const origin = `http://${address}:${port}`;
const firstQuestion = "Что такое справедливость?";

async function waitForApplication(server, listening) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error("The private Sophia server exited during startup.");
    try {
      if (!listening()) {
        await delay(200);
        continue;
      }
      const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
      await response.body?.cancel();
      if (response.ok) return;
    } catch {
      // The loopback listener has not started serving pages yet.
    }
    await delay(500);
  }
  throw new Error("The private Sophia server did not become ready.");
}

export async function withPrivateChat(record, replay) {
  const parent = join(root, "artifacts");
  await mkdir(parent, { recursive: true });
  const sandbox = await mkdtemp(join(parent, "plato-film-private-"));
  const outbox = join(sandbox, "outbox.jsonl");
  const env = {
    ...process.env,
    ACCOUNT_MODE: "local",
    ACCOUNT_ORIGIN: origin,
    ACCOUNT_DB_PATH: join(sandbox, "accounts.sqlite"),
    ACCOUNT_MAIL_TRANSPORT: "test",
    ACCOUNT_TEST_OUTBOX: outbox,
    CHAT_ACCESS_MODE: "local",
    CHAT_ALLOWED_ORIGINS: origin,
    CHAT_LEDGER_PATH: join(sandbox, "ledger.sqlite"),
  };
  const browser = await chromium.launch();
  const server = spawn(process.execPath, [
    "node_modules/next/dist/bin/next", "start", "--hostname", address, "--port", String(port),
  ], { cwd: root, env, stdio: ["ignore", "pipe", "inherit"] });
  const closed = new Promise(resolve => server.once("close", resolve));
  let reportedReady = false;
  let startupOutput = "";
  server.stdout.on("data", chunk => {
    if (!reportedReady) {
      startupOutput = (startupOutput + chunk).slice(-2048);
      reportedReady = /Ready in \d/i.test(startupOutput);
    }
    process.stdout.write(chunk);
  });
  try {
    await waitForApplication(server, () => reportedReady);
    const context = await browser.newContext({
      baseURL: origin, viewport: { width: 1440, height: 810 },
      deviceScaleFactor: 2, reducedMotion: "reduce",
    });
    if (replay) {
      let index = 0;
      await context.route("**/api/philosopher-chat", async route => {
        const turn = replay[index++];
        if (!turn || route.request().postDataJSON().message !== turn.question) {
          await route.abort();
          return;
        }
        await delay(3000);
        const event = (name, value) => `event: ${name}\ndata: ${JSON.stringify(value)}\n\n`;
        const reply = { message: turn.answer, outcome: "answer", sources: [], memory: { summary: "", recent: [] } };
        await route.fulfill({
          contentType: "text/event-stream; charset=utf-8",
          body: event("delta", { text: turn.answer }) + event("done", reply),
        });
      });
    }
    async function account(action, data) {
      const response = await context.request.post(`/api/account/${action}`, {
        headers: { origin }, data,
      });
      if (!response.ok()) throw new Error(`Account ${action}: HTTP ${response.status()}`);
    }
    const email = `${randomUUID()}@example.test`;
    const password = randomUUID();
    await account("register", { email, displayName: "Sophia", password, confirmPassword: password });
    const letters = (await readFile(outbox, "utf8")).trim().split("\n").map(line => JSON.parse(line));
    const verification = new URL(letters.find(letter => letter.to === email && letter.kind === "verify").url);
    const token = new URLSearchParams(verification.hash.slice(1)).get("token");
    await account("verify", { token, password, confirmPassword: password });
    const access = spawnSync(process.execPath, ["scripts/accounts/cli.ts", "grant-ai-chat", email], { cwd: root, env });
    if (access.status !== 0) throw new Error("Could not grant chat access in the private account database.");
    await account("login", { email, password });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    const trigger = page.getByRole("button", { name: "Разговор с философом" });
    const dialog = page.getByTestId("philosopher-conversation");
    const input = dialog.getByRole("textbox", { name: "Сообщение" });
    const send = dialog.getByRole("button", { name: "Отправить сообщение" });
    const history = dialog.getByRole("region", { name: "Область разговора" });
    const replies = history.locator('[class*="assistantMessage"] p');
    const turns = [];
    await record({
      page, trigger, dialog, input, send, history, firstQuestion, turns,
      async turn(question, onWait) {
        await input.fill(question);
        const pending = page.waitForResponse(response => response.url() === `${origin}/api/philosopher-chat`, { timeout: 120000 });
        await send.click();
        const wait = Promise.resolve().then(onWait).then(() => null, error => error);
        const response = await pending;
        if (!response.ok()) throw new Error(`Chat returned HTTP ${response.status()}.`);
        const body = await response.text();
        const done = body.trim().split(/\r?\n\r?\n/).findLast(event => /^event: done\r?\n/m.test(event));
        if (!done) throw new Error("The application did not return a complete model response.");
        const reply = JSON.parse(done.split(/\r?\n/).find(line => line.startsWith("data: ")).slice(6));
        if (reply.outcome !== "answer") throw new Error(`Chat outcome: ${reply.outcome}`);
        const bubble = replies.nth(turns.length);
        await bubble.waitFor({ timeout: 10000 });
        const answer = await bubble.textContent();
        if (!answer || answer !== reply.message) throw new Error("The displayed answer differs from the API response.");
        const captureError = await wait;
        if (captureError) throw captureError;
        const turn = { question, answer };
        turns.push(turn);
        return turn;
      },
    });
  } finally {
    await browser.close();
    server.kill();
    await closed;
    await rm(sandbox, { recursive: true, force: true, maxRetries: 3 });
  }
}
