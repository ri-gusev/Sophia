import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { accountTransaction, openAccountDatabase } from "../../src/features/account/server/database";
import { hashPassword, newToken, tokenHash } from "../../src/features/account/server/credentials";
import { ACCOUNT_SESSION_AGE } from "../../src/features/account/server/store";
import { accountTestSettings } from "./account-test-settings";
import { loginTestAccount, testEmail, testPassword } from "./accounts";

let passwordHash: Promise<string> | undefined;

export async function loginEntitledChat(page: Page, throughLogin = false) {
  const encoded = await (passwordHash ??= hashPassword(testPassword));
  const { database, origin } = accountTestSettings();
  const db = openAccountDatabase(database, true);
  const id = randomUUID();
  const email = testEmail();
  const now = Date.now();
  const token = newToken();
  try {
    // Most chat cases start with a valid session so the shared loopback login quota remains available for account tests.
    accountTransaction(db, () => {
      db.prepare(`INSERT INTO account_users
        (id, email, display_name, password_hash, email_verified_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, email, "Читатель Платона", encoded, now, now, now);
      db.prepare("INSERT INTO account_entitlements (user_id, capability, granted_at) VALUES (?, 'ai_chat', ?)").run(id, now);
      if (!throughLogin) db.prepare("INSERT INTO account_sessions VALUES (?, ?, ?, ?)")
        .run(tokenHash(token), id, now, now + ACCOUNT_SESSION_AGE);
    });
  } finally {
    db.close();
  }
  if (throughLogin) await loginTestAccount(page.request, { email, password: testPassword });
  else await page.context().addCookies([{
    name: "sophia-session", value: token, url: origin, httpOnly: true, sameSite: "Lax",
    expires: Math.floor((now + ACCOUNT_SESSION_AGE) / 1000),
  }]);
  return id;
}
