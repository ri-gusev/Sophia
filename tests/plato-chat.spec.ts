import { expect, test, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type TestMessage = { role: "user" | "assistant"; content: string };
type TestRequest = { philosopherId: string; message: string; memory: { summary: string; recent: TestMessage[] } };
const ANSWER = "Синтетический ответ для проверки интерфейса. [1]";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("Plato sends bounded local context, renders replies safely and keeps the conversation across client navigation", async ({ page }, testInfo) => {
  const calls: TestRequest[] = [];
  await page.route("**/api/philosopher-chat", async route => {
    const body = route.request().postDataJSON() as TestRequest;
    calls.push(body);
    const message = calls.length === 1 ? `${ANSWER}\n<img src=x onerror="window.chatInjected=true">` : "Ещё один синтетический ответ.";
    await route.fulfill({ json: { message, memory: { summary: "", recent: [...body.memory.recent, { role: "user", content: body.message }, { role: "assistant", content: message }] }, sources: [{ id: "test@1:1", documentId: "test", title: "Тестовый материал", revision: 1, reference: 1 }] } });
  });
  await page.goto("/learn");
  const trigger = page.getByRole("button", { name: "Разговор с философом", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Разговор с философом", exact: true });
  const composer = dialog.getByRole("textbox", { name: "Сообщение", exact: true });
  await composer.fill("Что такое добродетель?");
  await composer.press("Enter");
  await expect(dialog.getByRole("log")).toContainText(ANSWER);
  await expect(composer).toHaveValue("");
  await expect(dialog.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => "chatInjected" in window)).toBe(false);
  await composer.fill("А как это связано с моим вопросом?");
  await dialog.getByRole("button", { name: "Отправить сообщение" }).click();
  await expect(dialog.getByRole("log")).toContainText("Ещё один синтетический ответ.");
  expect(calls).toHaveLength(2);
  expect(calls[0].memory.recent).toEqual([]);
  expect(calls[1].memory.recent).toHaveLength(2);
  expect(Object.keys(calls[0]).sort()).toEqual(["memory", "message", "philosopherId"]);
  expect(calls[0].philosopherId).toBe("plato");
  await page.screenshot({ path: testInfo.outputPath("chat-conversation.png") });
  await dialog.getByRole("button", { name: /^Аристотель/ }).click();
  await expect(dialog.getByRole("log")).toHaveCount(0);
  await expect(composer).toBeDisabled();
  await dialog.getByRole("button", { name: /^Платон/ }).click();
  await expect(dialog.getByRole("log")).toContainText(ANSWER);
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="philosopher-conversation"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await dialog.getByRole("button", { name: "Закрыть разговор" }).click();
  await page.getByRole("link", { name: "Вернуться на главную", exact: true }).click();
  await trigger.click();
  await expect(dialog.getByRole("log")).toContainText(ANSWER);
  await dialog.getByRole("button", { name: "Новый разговор", exact: true }).click();
  await expect(dialog.getByRole("log")).toHaveCount(0);
  await composer.fill("Новый вопрос");
  await dialog.getByRole("button", { name: "Отправить сообщение" }).click();
  await expect(dialog.getByRole("log")).toContainText("Ещё один синтетический ответ.");
  expect(calls[2].memory.recent).toEqual([]);
  await page.reload();
  await trigger.click();
  await expect(dialog.getByRole("log")).toHaveCount(0);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test("failed requests keep the question and can be retried without a fake assistant reply", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/philosopher-chat", async route => {
    const body = route.request().postDataJSON() as TestRequest;
    attempts++;
    if (attempts === 1) await route.fulfill({ status: 503, json: { error: "Сервис временно недоступен. Попробуйте позже." } });
    else await route.fulfill({ json: { message: ANSWER, memory: { summary: "", recent: [{ role: "user", content: body.message }, { role: "assistant", content: ANSWER }] }, sources: [] } });
  });
  await page.goto("/learn");
  await page.getByRole("button", { name: "Разговор с философом", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Разговор с философом", exact: true });
  const composer = dialog.getByRole("textbox", { name: "Сообщение", exact: true });
  await composer.fill("Вопрос, который важно не потерять");
  await dialog.getByRole("button", { name: "Отправить сообщение" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Сервис временно недоступен");
  await expect(composer).toHaveValue("Вопрос, который важно не потерять");
  await expect(dialog.getByRole("log")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Отправить сообщение" }).click();
  await expect(dialog.getByRole("log")).toContainText(ANSWER);
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("pending replies can be cancelled without recording a completed turn", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  let waiting: Route | undefined;
  let requestCount = 0;
  await page.route("**/api/philosopher-chat", route => { requestCount++; waiting = route; });
  await page.goto("/learn");
  await page.getByRole("button", { name: "Разговор с философом", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Разговор с философом", exact: true });
  const composer = dialog.getByRole("textbox", { name: "Сообщение", exact: true });
  await composer.fill("Остановленный вопрос");
  await dialog.getByRole("button", { name: "Отправить сообщение" }).click();
  await expect(dialog.getByRole("status")).toContainText("размышляет");
  await expect(composer).toBeDisabled();
  await dialog.getByRole("button", { name: "Остановить ответ" }).click();
  await expect(dialog.getByRole("alert")).toContainText("остановлена");
  await expect(composer).toHaveValue("Остановленный вопрос");
  await expect(dialog.getByRole("log")).toHaveCount(0);
  expect(requestCount).toBe(1);
  expect(runtimeErrors).toEqual([]);
  await waiting?.abort().catch(() => {});
});

test("real API boundary rejects cross-origin and invalid philosopher requests before contacting the provider", async ({ request, baseURL }) => {
  const body = { philosopherId: "aristotle", message: "Вопрос", memory: { summary: "", recent: [] } };
  const rejectedOrigin = await request.post("/api/philosopher-chat", { headers: { origin: "https://unrelated.example" }, data: body });
  expect(rejectedOrigin.status()).toBe(403);
  const rejectedPhilosopher = await request.post("/api/philosopher-chat", { headers: { origin: baseURL! }, data: body });
  expect(rejectedPhilosopher.status()).toBe(400);
  expect(rejectedPhilosopher.headers()["cache-control"]).toBe("no-store");
});
