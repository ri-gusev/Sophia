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
  await expect(dialog.getByRole("log")).not.toContainText("Тестовый материал");
  await expect(dialog.getByText("Материалы к ответу", { exact: true })).toHaveCount(0);
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
  await expect(dialog.getByRole("status").filter({ hasText: "размышляет" })).toBeVisible();
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

test("validated SSE delivery preserves structured user definitions for the next turn", async ({ page }) => {
  const calls: (TestRequest & { memory: { dialogue?: unknown } })[] = [];
  const dialogue = { current_topic: "общение", user_theses: [], open_questions: [], contradictions: [], introduced_concepts: [{ concept: "смартфон", explanation: "Устройство для общения" }], dialogue_stage: "analogy" };
  await page.route("**/api/philosopher-chat", async route => {
    const body = route.request().postDataJSON(); calls.push(body);
    expect(route.request().headers().accept).toContain("text/event-stream");
    const message = "Рассмотрим общение и понимание.";
    const result = { message, memory: { summary: "", recent: [{ role: "user", content: body.message }, { role: "assistant", content: message }], dialogue }, sources: [] };
    await route.fulfill({ contentType: "text/event-stream", body: `event: delta\ndata: ${JSON.stringify({ text: message })}\n\nevent: done\ndata: ${JSON.stringify(result)}\n\n` });
  });
  await page.goto("/learn");
  await page.getByRole("button", { name: "Разговор с философом", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Разговор с философом", exact: true });
  const composer = dialog.getByRole("textbox", { name: "Сообщение", exact: true });
  await composer.fill("Смартфон — устройство для общения.");
  await dialog.getByRole("button", { name: "Отправить сообщение" }).click();
  await expect(composer).toBeEnabled();
  await expect(dialog.getByRole("log")).toContainText("Рассмотрим общение");
  await composer.fill("Что это меняет?");
  await dialog.getByRole("button", { name: "Отправить сообщение" }).click();
  await expect.poll(() => calls.length).toBe(2);
  expect(calls[1].memory.dialogue).toEqual(dialogue);
  await expect(composer).toBeEnabled();
});

test("safety handler replies are identified as Sophia rather than the historical persona", async ({ page }) => {
  await page.route("**/api/philosopher-chat", route => route.fulfill({ json: { message: "Я не могу помочь с такими инструкциями. Можем обсудить этическую сторону вопроса.", memory: { summary: "", recent: [] }, sources: [], outcome: "safety" } }));
  await page.goto("/learn");
  await page.getByRole("button", { name: "Разговор с философом", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Разговор с философом", exact: true });
  await dialog.getByRole("textbox", { name: "Сообщение", exact: true }).fill("Синтетический запрос безопасности");
  await dialog.getByRole("button", { name: "Отправить сообщение" }).click();
  await expect(dialog.getByRole("log")).toContainText("Я не могу помочь");
  await expect(dialog.getByRole("log").getByText("Sophia", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("log").getByText("Платон · ИИ", { exact: true })).toHaveCount(0);
});


test("composer limits typing and paste to 50 words", async ({ page }) => {
  await page.goto("/learn");
  await page.getByRole("button", { name: "Разговор с философом", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Разговор с философом", exact: true });
  const composer = dialog.getByRole("textbox", { name: "Сообщение", exact: true });
  const fifty = Array(50).fill("слово").join(" ");
  await composer.fill(fifty);
  await expect(composer).toHaveValue(fifty);
  await expect(dialog.getByRole("status")).toContainText("50 / 50 слов");
  await composer.press("End");
  await composer.pressSequentially(" ещё");
  await expect(composer).toHaveValue(fifty + " ");
  await composer.fill(fifty + " лишнее");
  await expect(composer).toHaveValue(fifty + " ");
  await composer.fill("Короткий вопрос");
  await expect(composer).toHaveValue("Короткий вопрос");
  await expect(dialog.getByRole("status")).toContainText("2 / 50 слов");
});
