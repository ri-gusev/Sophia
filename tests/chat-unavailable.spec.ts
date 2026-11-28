import { expect, test, type Locator } from "@playwright/test";
import { accountTestSettings } from "./support/account-test-settings";
import { loginEntitledChat } from "./support/chat-account";

test.use({ baseURL: accountTestSettings("disabled-chat").origin });

async function expectUnavailable(workspace: Locator) {
  const plato = workspace.getByRole("button", { name: "Платон Временно недоступен", exact: true });
  await expect(plato).toHaveAttribute("aria-pressed", "true");
  await expect(workspace.getByRole("heading", { name: "Платон", exact: true })).toBeVisible();
  await expect(workspace.getByText("Мы совершенствуем ИИ-собеседника, чтобы сделать философские диалоги ещё глубже. Скоро он станет доступен", { exact: true })).toBeVisible();
  await expect(workspace.getByRole("textbox")).toHaveCount(0);
  await expect(workspace.getByRole("button", { name: "Отправить сообщение" })).toHaveCount(0);
  await expect(workspace.getByRole("button", { name: "Новый разговор" })).toHaveCount(0);
}

test("the paused chat preserves the home and course entry points for a guest", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Разговор с философом", exact: true });
  const dialog = page.getByRole("dialog", { name: "Разговор с философом" });
  await page.goto("/");
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Разговор с философом" }) });
  await expect(card.getByText("Временно недоступен", { exact: true })).toBeVisible();
  await trigger.click();
  await expectUnavailable(dialog);
  await dialog.getByRole("link", { name: "бесплатные уроки" }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await trigger.click();
  await expectUnavailable(dialog);
  await dialog.getByRole("link", { name: "философский атлас" }).click();
  await expect(page).toHaveURL(/\/atlas$/);
});

test("opening the chat URL as an entitled account cannot show a composer or send a message", async ({ page }) => {
  await loginEntitledChat(page);
  const requests: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/philosopher-chat") requests.push(request.url());
  });
  const response = await page.goto("/chat?AI_CHAT_ENABLED=true");
  expect(response?.status()).toBe(200);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Разговор с философом", level: 1 })).toBeVisible();
  await expectUnavailable(main);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await main.getByRole("button", { name: "Платон Временно недоступен" }).press("Enter");
  await expectUnavailable(main);
  expect(requests).toEqual([]);
  await expect(page.getByRole("link", { name: "Sophia — на главную" })).toBeVisible();
});
