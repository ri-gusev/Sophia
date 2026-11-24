import { expect, test, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginEntitledChat } from "./support/chat-account";

type TestMessage = { role: "user" | "assistant"; content: string };
type TestRequest = { philosopherId: string; message: string; memory: { summary: string; recent: TestMessage[] } };
const ANSWER = "Синтетический ответ для проверки интерфейса. [1]";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("the guest sees the Premium notice and free destinations without sending a chat request", async ({ page }) => {
  const chatRequests: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/philosopher-chat") chatRequests.push(request.method());
  });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Разговор с философом", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Разговор с философом", exact: true });
  await expect(dialog).toContainText("AI-диалоги станут доступны с Sophia Premium. Сейчас можно изучать бесплатные уроки и философский атлас.");
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Отправить сообщение" })).toHaveCount(0);
  const course = dialog.getByRole("link", { name: "бесплатные уроки" });
  await course.click();
  await expect(page).toHaveURL(/\/learn$/);
  await trigger.click();
  await dialog.getByRole("link", { name: "философский атлас" }).click();
  await expect(page).toHaveURL(/\/atlas$/);
  expect(chatRequests).toEqual([]);
});

test("Plato sends bounded local context, renders replies safely and keeps the conversation across client navigation", async ({ page }, testInfo) => {
  const account = await loginEntitledChat(page);
  const calls: TestRequest[] = [];
  await page.route("**/api/philosopher-chat", async route => {
    expect(route.request().headers()["x-sophia-chat-scope"]).toBe(account);
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
  await expect(composer).toHaveAccessibleDescription(/Ваши сообщения передаются AI-провайдеру.*Не отправляйте пароли/);
  await expect(dialog.getByText(/Ответы создаются искусственным интеллектом/)).toBeVisible();
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
  await loginEntitledChat(page);
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

test("a stale tab discards the conversation when a different account owns the session", async ({ page }) => {
  await loginEntitledChat(page);
  await page.route("**/api/philosopher-chat", route => route.fulfill({ json: {
    message: ANSWER, memory: { summary: "", recent: [] }, sources: [],
  } }), { times: 1 });
  await page.goto("/learn");
  await page.getByRole("button", { name: "Разговор с философом", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Разговор с философом", exact: true });
  const composer = dialog.getByRole("textbox", { name: "Сообщение", exact: true });
  await composer.fill("Переписка первого аккаунта");
  await composer.press("Enter");
  await expect(dialog.getByRole("log")).toContainText(ANSWER);

  // The real session rotates without sending any client navigation notification to this document.
  await loginEntitledChat(page, true);
  await composer.fill("Продолжение переписки");
  const denied = page.waitForResponse(response => new URL(response.url()).pathname === "/api/philosopher-chat");
  await composer.press("Enter");
  expect((await denied).status()).toBe(403);
  await expect(dialog.getByText(/AI-диалоги станут доступны/)).toBeVisible();
  await expect(dialog.getByRole("log")).toHaveCount(0);
  await expect(composer).toHaveCount(0);
});

test("pending replies can be cancelled without recording a completed turn", async ({ page }) => {
  await loginEntitledChat(page);
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

test("real API boundary rejects foreign origins and unauthenticated requests", async ({ request, baseURL }) => {
  const body = { philosopherId: "plato", message: "Вопрос", memory: { summary: "", recent: [] }, isPremium: true };
  const rejectedOrigin = await request.post("/api/philosopher-chat", { headers: { origin: "https://unrelated.example" }, data: body });
  expect(rejectedOrigin.status()).toBe(403);
  const rejectedGuest = await request.post("/api/philosopher-chat", { headers: { origin: baseURL! }, data: body });
  expect(rejectedGuest.status()).toBe(401);
  expect(rejectedGuest.headers()["cache-control"]).toBe("no-store");
});

test("validated SSE delivery preserves structured user definitions for the next turn", async ({ page }) => {
  await loginEntitledChat(page);
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
  await loginEntitledChat(page);
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
  await loginEntitledChat(page);
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
