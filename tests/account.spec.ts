import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { accountTestSettings } from "./support/account-test-settings";
import { createTestAccount, loginTestAccount, postAccount, testEmail, testMailLink, testPassword as password } from "./support/accounts";

async function enterPassword(page: Page, value = password) {
  await page.getByLabel("Пароль", { exact: true }).fill(value);
  await page.getByLabel("Повтор пароля").fill(value);
}

test("registration, mailbox verification, profile edit and logout through the UI", async ({ page }) => {
  const address = testEmail();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
  await page.getByRole("link", { name: "Зарегистрироваться" }).click();
  await page.getByLabel("Отображаемое имя").fill("Мария Петрова");
  await page.getByLabel("Email").fill(address.toUpperCase());
  await enterPassword(page);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.getByRole("status")).toContainText("Проверьте почту");
  const initialLink = await testMailLink(address, "verify");
  const resend = page.getByRole("button", { name: "Отправить повторно" });
  await expect(resend).toBeVisible();
  await resend.click();
  await expect(page.getByRole("status")).toContainText("ссылку ещё раз");
  await page.goto((await testMailLink(address, "verify", initialLink)).href);
  await enterPassword(page);
  await page.getByRole("button", { name: "Подтвердить email" }).click();
  await expect(page.getByRole("status")).toContainText("Email подтверждён");
  await page.getByRole("main").getByRole("link", { name: "Войти", exact: true }).click();
  await page.getByLabel("Email").fill(address);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { name: "Мария Петрова" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Мой путь в философии" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("main").getByText(address)).toBeVisible();
  await page.getByRole("button", { name: "Изменить имя" }).click();
  await page.getByLabel("Отображаемое имя").fill("Мария Соколова");
  await page.getByRole("button", { name: "Сохранить имя" }).click();
  await expect(page.getByRole("heading", { name: "Мария Соколова" })).toBeVisible();
  const secondTab = await page.context().newPage();
  try {
    await secondTab.goto("/atlas");
    await secondTab.getByRole("navigation", { name: "Навигация Атласа" }).getByRole("link", { name: "Профиль" }).click();
    await expect(secondTab.getByRole("heading", { name: "Мария Соколова" })).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Выйти" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(secondTab).toHaveURL(/\/login\?next=%2Fprofile$/);
  } finally {
    await secondTab.close();
  }
});

test("profile, login and registration fit every target viewport and pass axe", async ({ page, browser }) => {
  test.slow();
  const account = await createTestAccount(page.request, "Александра Соколова");
  const guestContext = await browser.newContext({ baseURL: accountTestSettings().origin });
  const guest = await guestContext.newPage();
  await loginTestAccount(page.request, account);
  try {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await guest.setViewportSize({ width, height: 900 });
      for (const path of ["/register", "/login"]) {
        await guest.goto(path);
        expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect((await new AxeBuilder({ page: guest }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
      }
      await page.goto("/profile");
      await expect(page.getByRole("heading", { name: "Александра Соколова" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
    }
  } finally {
    await guestContext.close();
  }
});

test("keyboard validation links errors to the fields and focuses the first invalid field", async ({ page }) => {
  await page.goto("/register");
  const name = page.getByLabel("Отображаемое имя");
  await name.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email")).toBeFocused();
  const submit = page.getByRole("button", { name: "Создать аккаунт" });
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription(/имя/i);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Проверьте отмеченные поля.");
});

test("registration explains the email restriction and rejects unsupported domains through the form and API", async ({ page }) => {
  const message = "На данный момент регистрация доступна только с использованием российских почтовых сервисов: Яндекс, Mail.ru, Рамблер и VK Почта";
  const displayName = "Мария Петрова";
  await page.goto("/register");
  await page.getByRole("main").getByRole("link", { name: "Пользовательское соглашение" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { name: "Пользовательское соглашение Sophia" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("yandex.ru, ya.ru, mail.ru");
  await page.goBack();

  const intercepted: string[] = [];
  await page.route("**/api/account/register", async route => {
    intercepted.push(route.request().url());
    await route.abort();
  });
  await page.getByLabel("Отображаемое имя").fill(displayName);
  const field = page.getByLabel("Email");
  await field.fill("user@gmail.com");
  await enterPassword(page);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(field).toBeFocused();
  await expect(field).toHaveAccessibleDescription(message);
  expect(intercepted).toEqual([]);

  const response = await postAccount(page.request, "register", {
    displayName, email: "user@sub.mail.ru", password, confirmPassword: password,
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: message });
});

test("registration and new password fields cap pasted text at fifty characters", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const text = "a".repeat(60);
  const token = "a".repeat(43);
  for (const [route, labels] of [
    ["/register", ["Отображаемое имя", "Email", "Пароль", "Повтор пароля"]],
    [`/reset-password#token=${token}`, ["Пароль", "Повтор пароля"]],
  ] as const) {
    await page.goto(route);
    await page.evaluate(value => navigator.clipboard.writeText(value), text);
    for (const label of labels) {
      const field = page.getByLabel(label, { exact: true });
      await expect(field).toHaveAttribute("maxlength", "50");
      await field.focus();
      await page.keyboard.press("Control+v");
      await expect(field).toHaveValue(text.slice(0, 50));
    }
  }
});

test("the server-rendered login and registration forms cannot send credentials in a URL", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: accountTestSettings().origin, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const path of ["/login", "/register"]) {
      await page.goto(path);
      await expect(page.locator("main form")).toHaveAttribute("method", "post");
      await expect(page.locator("main form button[type=submit]")).toBeDisabled();
    }
  } finally {
    await context.close();
  }
});

test("password recovery works from an email and revokes the old browser session", async ({ page, browser }) => {
  const account = await createTestAccount(page.request, "Первый пользователь");
  await loginTestAccount(page.request, account);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Первый пользователь" })).toBeVisible();
  const recovery = await browser.newPage({ baseURL: accountTestSettings().origin });
  const resetTab = await page.context().newPage();
  const replacement = `${password}, новая`;
  try {
    await recovery.goto("/login");
    await recovery.getByRole("link", { name: "Забыли пароль?" }).click();
    await expect(recovery.getByRole("heading", { name: "Восстановление доступа" })).toBeVisible();
    await recovery.getByLabel("Email").fill(account.email);
    await recovery.getByRole("button", { name: "Отправить ссылку" }).click();
    await expect(recovery.getByRole("status")).toContainText("Если для этого email есть аккаунт");
    await resetTab.goto((await testMailLink(account.email, "reset")).href);
    await enterPassword(resetTab, replacement);
    await resetTab.getByRole("button", { name: "Сохранить пароль" }).click();
    await expect(resetTab.getByRole("status")).toContainText("Пароль обновлён");
    await expect(page).toHaveURL(/\/login\?/);
    await recovery.goto("/login?next=%2F%2Fexample.test%2Foutside");
    await recovery.getByLabel("Email").fill(account.email);
    await recovery.getByLabel("Пароль", { exact: true }).fill(replacement);
    await recovery.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(recovery).toHaveURL(/\/profile$/);
  } finally {
    await resetTab.close();
    await recovery.close();
  }
});
