import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { accountTestSettings } from "./support/account-test-settings";
import { createTestAccount, loginTestAccount, postAccount, seedVerifiedTestAccount, testEmail, testMailLink, testPassword as password } from "./support/accounts";
import { legalAcceptance } from "./support/legal-confirmations";

async function enterPassword(page: Page, value = password) {
  await page.getByLabel("Пароль", { exact: true }).fill(value);
  await page.getByLabel("Повтор пароля").fill(value);
}

async function acceptLegalConditions(page: Page) {
  for (const checkbox of await page.getByRole("checkbox").all()) {
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
  }
}

test("registration, mailbox verification, profile edit and logout through the UI", async ({ page }) => {
  const address = testEmail();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
  await page.getByRole("link", { name: "Зарегистрироваться" }).click();
  await expect(page.getByText("Сначала подтвердите почту. Пароль вы зададите по ссылке из письма.")).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.getByLabel("Отображаемое имя").fill("Мария Петрова");
  await page.getByLabel("Email").fill(address.toUpperCase());
  const mailingCheckbox = page.getByRole("checkbox", { name: "Согласен получать рекламные и информационные рассылки" });
  await expect(page.getByRole("checkbox")).toHaveCount(4);
  await expect(page.locator('input[type="checkbox"][required]')).toHaveCount(3);
  await expect(mailingCheckbox).not.toBeChecked();
  await expect(page.getByRole("main").getByRole("link", { name: "Условия рассылок" })).toHaveAttribute("href", "/mailing-consent");
  await page.getByRole("button", { name: "Отправить ссылку" }).click();
  await expect(page.getByRole("checkbox").first()).toBeFocused();
  await expect(page.getByRole("checkbox").first()).toHaveAccessibleDescription(/все|каждое/);
  await acceptLegalConditions(page);
  await mailingCheckbox.check();
  await page.getByRole("button", { name: "Отправить ссылку" }).click();
  await expect(page.getByRole("status")).toContainText("Проверьте почту");
  const initialLink = await testMailLink(address, "verify");
  const resend = page.getByRole("button", { name: "Отправить повторно" });
  await expect(resend).toBeVisible();
  await resend.click();
  await expect(page.getByRole("status")).toContainText("ссылку ещё раз");
  const refreshedLink = await testMailLink(address, "verify", initialLink);
  await page.goto(refreshedLink.href);
  await enterPassword(page);
  await expect(page.getByRole("checkbox")).toHaveCount(4);
  await expect(mailingCheckbox).not.toBeChecked();
  await mailingCheckbox.check();
  await page.evaluate(() => { window.location.hash = `token=${"a".repeat(43)}`; });
  await expect(mailingCheckbox).not.toBeChecked();
  await page.evaluate(hash => { window.location.hash = hash; }, refreshedLink.hash);
  await acceptLegalConditions(page);
  await mailingCheckbox.check();
  await page.getByRole("button", { name: "Подтвердить email" }).click();
  await expect(page.getByRole("status")).toContainText("Email подтверждён");
  await page.getByRole("main").getByRole("link", { name: "Войти", exact: true }).click();
  await page.getByLabel("Email").fill(address);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { name: "Мария Петрова" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Твоё обучение" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Настройки аккаунта" }).click();
  await expect(page).toHaveURL(/\/profile#account-settings$/);
  const settings = page.getByRole("region", { name: "Настройки аккаунта" });
  await expect(settings).toBeFocused();
  const security = settings.locator("summary", { hasText: /^Безопасность$/ });
  const recoveryLink = settings.getByRole("link", { name: "Восстановить пароль" });
  await expect(recoveryLink).toBeHidden();
  await security.press("Enter");
  await expect(recoveryLink).toHaveAttribute("href", "/forgot-password");
  await expect(recoveryLink).toBeVisible();
  await security.press("Space");
  await expect(recoveryLink).toBeHidden();
  const mailings = settings.locator("details", { has: page.getByText("Рассылки", { exact: true }) });
  const mailingsSummary = mailings.locator("summary");
  await mailingsSummary.click();
  await expect(mailings.getByRole("status")).toHaveText("Согласие на рассылки предоставлено.");
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mailings.getByRole("button", { name: "Отозвать согласие на рассылки" }).click();
  await expect(mailings.getByRole("status")).toHaveText("Согласие на рассылки отозвано.");
  await expect(mailings.getByRole("link", { name: "Условия рассылок" })).toBeFocused();
  await page.setViewportSize(viewport);
  await page.reload();
  await mailingsSummary.click();
  await expect(mailings.getByRole("status")).toHaveText("Рассылки отключены.");
  await mailings.getByRole("button", { name: "Дать согласие на рассылки" }).click();
  await expect(mailings.getByRole("status")).toHaveText("Согласие на рассылки предоставлено.");
  await page.reload();
  await mailingsSummary.click();
  await expect(mailings.getByRole("button", { name: "Отозвать согласие на рассылки" })).toBeVisible();
  await settings.getByText("Личные данные", { exact: true }).click();
  await expect(settings.getByText(address, { exact: true })).toBeVisible();
  await settings.getByRole("button", { name: "Изменить имя" }).click();
  await page.getByLabel("Отображаемое имя").fill("Мария Соколова");
  await page.getByRole("button", { name: "Сохранить имя" }).click();
  await expect(page.getByRole("heading", { name: "Мария Соколова" })).toBeVisible();
  const secondTab = await page.context().newPage();
  try {
    await secondTab.goto("/atlas");
    await secondTab.getByRole("navigation", { name: "Навигация Атласа" }).getByRole("link", { name: "Профиль" }).click();
    await expect(secondTab.getByRole("heading", { name: "Мария Соколова" })).toBeVisible();
    await settings.getByRole("button", { name: "Выйти из аккаунта" }).click();
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
  const submit = page.getByRole("button", { name: "Отправить ссылку" });
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
  await expect(page.getByRole("main")).toContainText("Редакция");
  await page.goBack();

  const intercepted: string[] = [];
  await page.route("**/api/account/register", async route => {
    intercepted.push(route.request().url());
    await route.abort();
  });
  await page.getByLabel("Отображаемое имя").fill(displayName);
  const field = page.getByLabel("Email");
  await expect(field).toHaveAccessibleDescription(/yandex\.ru, ya\.ru, mail\.ru/);
  await field.fill("user@gmail.com");
  await page.getByRole("button", { name: "Отправить ссылку" }).click();
  await expect(field).toBeFocused();
  await expect(field).toHaveAccessibleDescription(new RegExp(message.replaceAll(".", "\\.")));
  expect(intercepted).toEqual([]);

  const response = await postAccount(page.request, "register", {
    ...legalAcceptance, displayName, email: "user@sub.mail.ru",
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: message });
});

test("the shared footer and readable legal drafts display the 18+ mark", async ({ page }) => {
  const external = new Set<string>();
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.origin !== accountTestSettings().origin) external.add(url.origin);
  });
  const docs = [
    ["/privacy", "Политика обработки персональных данных", "Сроки хранения"],
    ["/terms", "Пользовательское соглашение", "Доступ и регистрация"],
    ["/consent", "Согласие на обработку персональных данных", "Срок и отзыв"],
    ["/mailing-consent", "Согласие на получение рекламных и информационных рассылок", "Добровольность согласия", "Согласие на рассылки"],
  ];
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByText("18+", { exact: true })).toBeVisible();
  for (const [path, label, section, footerLabel] of docs) {
    await footer.getByRole("link", { name: footerLabel ?? label }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name: `${label} Sophia` })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: new RegExp(section) })).toBeVisible();
    await expect(page.getByRole("main")).toContainText("Проект документа");
    await expect(page.getByRole("main")).toContainText("Редакция 1.0.");
    await expect(page.locator("main time")).toHaveCount(0);
    await expect(page.getByRole("main").getByText(/Возрастная маркировка .*18\+/)).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("Приложение для владельца");
    if (path === "/privacy" || path === "/consent") {
      await expect(page.getByRole("main")).toContainText("Yandex Compute Cloud");
      await expect(page.getByRole("main")).toContainText("Yandex Cloud Postbox");
      await expect(page.getByRole("main")).toContainText("ООО «Яндекс.Облако»");
      await expect(page.getByRole("main")).toContainText("Юридический адрес: 119021, г. Москва, ул. Льва Толстого, д. 16, помещ. 528.");
      await expect(page.getByRole("main")).toContainText("ИНН: 7704458262. ОГРН: 1187746678580.");
      await expect(page.getByRole("main")).not.toContainText(/timeweb|таймвэб/i);
    }
    await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", "noindex");
    if (path === "/privacy") {
      await expect(page.getByRole("main")).toContainText("GPG с AES-256");
      await expect(page.getByRole("main")).toContainText("14 суток");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  }
  expect([...external]).toEqual([]);
  await page.goto("/learn");
  await expect(footer.getByText("18+", { exact: true })).toBeVisible();
});

test("profile withdrawal checks the password and clears account-scoped browser data", async ({ page }) => {
  const account = await seedVerifiedTestAccount();
  await loginTestAccount(page.request, account);
  await page.goto("/profile");
  const { accountId } = await (await page.request.get("/api/progress")).json();
  const settings = page.getByRole("region", { name: "Настройки аккаунта" });
  const privacy = settings.locator("summary", { hasText: /^Конфиденциальность$/ });
  const profile = settings.getByRole("region", { name: "Удаление аккаунта" });
  const label = "Отозвать согласие и удалить аккаунт";
  await expect(profile).toBeHidden();
  await privacy.press("Enter");
  await expect(settings.getByRole("link", { name: "Политика обработки персональных данных" })).toHaveAttribute("href", "/privacy");
  await expect(profile.getByRole("button")).toHaveText([label]);
  await page.evaluate(accountId => {
    localStorage.setItem(`sophia.account.${accountId}.lesson-resume.v2:fixture`, "test");
    localStorage.setItem(`sophia.account.${accountId}.guest-progress-import.v1`, "test");
    localStorage.setItem("sophia.lesson-resume.v2:guest-fixture", "test");
  }, accountId);
  await profile.getByRole("button", { name: label }).click();
  await expect(profile.getByLabel("Текущий пароль")).toBeFocused();
  await profile.getByRole("button", { name: "Отмена" }).click();
  await expect(profile.getByRole("button", { name: label })).toBeFocused();
  await profile.getByRole("button", { name: label }).click();
  await profile.getByLabel("Текущий пароль").fill("Некорректная парольная фраза");
  await profile.getByRole("checkbox").check();
  await profile.getByRole("button", { name: label }).click();
  await expect(profile.getByRole("alert")).toContainText("Текущий пароль указан неверно.");
  const lessonTab = await page.context().newPage();
  await lessonTab.goto("/learn#lesson=plato-introduction&scene=journey");
  await expect(lessonTab.getByTestId("lesson-introduction")).toBeVisible();
  await lessonTab.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await profile.getByLabel("Текущий пароль").fill(password);
  await profile.getByRole("button", { name: label }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(lessonTab).toHaveURL(/\/learn$/);
  expect(await page.evaluate(accountId => ({
    accountKeys: Object.keys(localStorage).filter(key => key.startsWith(`sophia.account.${accountId}.`)),
    markerContainsAccountId: localStorage.getItem("sophia.account-session-change")?.includes(accountId),
    guest: localStorage.getItem("sophia.lesson-resume.v2:guest-fixture"),
  }), accountId)).toEqual({ accountKeys: [], markerContainsAccountId: false, guest: "test" });
  await lessonTab.close();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
});

test("registration and new password fields cap pasted text at fifty characters", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const text = "a".repeat(60);
  const token = "a".repeat(43);
  for (const [route, labels] of [
    ["/register", ["Отображаемое имя", "Email"]],
    [`/verify-email#token=${token}`, ["Пароль", "Повтор пароля"]],
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
