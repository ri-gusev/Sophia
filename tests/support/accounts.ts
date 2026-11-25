import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, type APIRequestContext } from "@playwright/test";
import { openAccountDatabase } from "../../src/features/account/server/database";
import { hashPassword } from "../../src/features/account/server/credentials";
import { accountTestSettings } from "./account-test-settings";
import { legalAcceptance } from "./legal-confirmations";

export const testPassword = "Длинная и удобная парольная фраза";
export const testEmail = () => `${randomUUID()}@mail.ru`;

export function postAccount(request: APIRequestContext, action: string, data: object) {
  return request.post(`/api/account/${action}`, { data, headers: { origin: accountTestSettings().origin } });
}

export async function testMailLink(to: string, kind: "verify" | "reset", previous?: URL) {
  let result: URL | undefined;
  await expect.poll(async () => {
    const raw = await readFile(accountTestSettings().outbox, "utf8").catch(() => "");
    const letters: { to: string; kind: string; url: string }[] = raw.trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
    const letter = letters.findLast(item => item.to === to && item.kind === kind);
    result = letter ? new URL(letter.url) : undefined;
    return result?.href === previous?.href ? undefined : result?.pathname;
  }).toBe(kind === "verify" ? "/verify-email" : "/reset-password");
  if (!result) throw new Error("Missing test message");
  return result;
}

export async function createTestAccount(request: APIRequestContext, displayName = "Пользователь Sophia") {
  const email = testEmail();
  const password = testPassword;
  expect((await postAccount(request, "register", { ...legalAcceptance, displayName, email, password, confirmPassword: password })).ok()).toBe(true);
  const token = new URLSearchParams((await testMailLink(email, "verify")).hash.slice(1)).get("token");
  expect((await postAccount(request, "verify", { ...legalAcceptance, token, password, confirmPassword: password })).ok()).toBe(true);
  return { email, password };
}

export async function seedVerifiedTestAccount(displayName = "Пользователь Sophia") {
  const email = testEmail();
  const hash = await hashPassword(testPassword);
  const now = Date.now();
  const db = openAccountDatabase(accountTestSettings().database, true);
  try {
    db.prepare("INSERT INTO account_users VALUES (?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), email, displayName, hash, now, now, now);
  } finally {
    db.close();
  }
  return { email, password: testPassword };
}

export async function loginTestAccount(request: APIRequestContext, credentials: { email: string; password: string }) {
  expect((await postAccount(request, "login", credentials)).ok()).toBe(true);
}
