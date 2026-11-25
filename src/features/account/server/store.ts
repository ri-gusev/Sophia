import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { UNSUPPORTED_ACCOUNT_EMAIL_MESSAGE, isApprovedAccountEmail, type AccountUser } from "../account-contract.ts";
import { accountDb, accountTransaction } from "./database.ts";
import { newToken, tokenHash, validToken } from "./credentials.ts";
import { AccountError } from "./errors.ts";

export const ACCOUNT_SESSION_AGE = 30 * 24 * 60 * 60 * 1000;
export const challengeExpired = () => new AccountError(400, "Ссылка недействительна или её срок истёк. Запроси новую ссылку.");
export const invalidLogin = () => new AccountError(401, "Проверь email, пароль и подтверждение почты.");

export function requireApprovedAccountEmail(email: unknown): void {
  if (typeof email !== "string" || !isApprovedAccountEmail(email)) {
    throw new AccountError(400, UNSUPPORTED_ACCOUNT_EMAIL_MESSAGE);
  }
}

const USER_COLUMNS = `u.id, u.email, u.display_name AS displayName,
  u.created_at AS createdAt, u.email_verified_at AS emailVerifiedAt`;

type Credentials = { id: string; passwordHash: string };
type Challenge = { email: string; userId: string | null; displayName: string | null };
type ChallengeKind = "verify" | "reset";

function credentialsIn(db: DatabaseSync, email: string): Credentials | undefined {
  return db.prepare("SELECT id, password_hash AS passwordHash FROM account_users WHERE email = ?").get(email) as Credentials | undefined;
}

export function credentialsForEmail(email: string): Credentials | undefined {
  return credentialsIn(accountDb(), email);
}

function sessionIn(db: DatabaseSync, token: string, now: number): AccountUser | null {
  return db.prepare(`SELECT ${USER_COLUMNS} FROM account_sessions AS s
    JOIN account_users AS u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.email_verified_at > 0`)
    .get(tokenHash(token), now) as AccountUser | undefined ?? null;
}

export function findSession(token: unknown, now = Date.now()): AccountUser | null {
  return validToken(token) ? sessionIn(accountDb(), token, now) : null;
}

export function replaceSession(email: string, authenticated: Credentials, previousToken?: string): string {
  const db = accountDb();
  return accountTransaction(db, () => {
    const current = credentialsIn(db, email);
    if (current?.id !== authenticated.id || current.passwordHash !== authenticated.passwordHash) throw invalidLogin();
    const token = newToken();
    const now = Date.now();
    db.prepare("DELETE FROM account_sessions WHERE expires_at <= ?").run(now);
    if (validToken(previousToken)) db.prepare("DELETE FROM account_sessions WHERE token_hash = ?").run(tokenHash(previousToken));
    db.prepare("INSERT INTO account_sessions VALUES (?, ?, ?, ?)").run(tokenHash(token), current.id, now, now + ACCOUNT_SESSION_AGE);
    return token;
  });
}

export function issueChallenge(kind: ChallengeKind, email: string, displayName?: string): string | null {
  const db = accountDb();
  return accountTransaction(db, () => {
    const user = credentialsIn(db, email);
    if ((kind === "verify" && user) || (kind === "reset" && !user)) return null;
    const now = Date.now();
    if (kind === "verify" && displayName === undefined) {
      const pending = db.prepare(`SELECT display_name FROM account_challenges
        WHERE kind = 'verify' AND email = ? AND expires_at > ?
        ORDER BY expires_at DESC, rowid DESC LIMIT 1`).get(email, now);
      if (typeof pending?.display_name !== "string") return null;
      displayName = pending.display_name;
    }
    const token = newToken();
    db.prepare("DELETE FROM account_challenges WHERE expires_at <= ?").run(now);
    db.prepare("INSERT INTO account_challenges VALUES (?, ?, ?, ?, ?, ?)").run(tokenHash(token), kind, email,
      user?.id ?? null, displayName ?? null, now + (kind === "verify" ? 24 * 60 : 30) * 60_000);
    return token;
  });
}

export function deleteChallenge(token: string): void {
  accountDb().prepare("DELETE FROM account_challenges WHERE token_hash = ?").run(tokenHash(token));
}

function requireChallenge(db: DatabaseSync, kind: ChallengeKind, token: string, now: number): Challenge {
  const challenge = db.prepare(`SELECT email, user_id AS userId, display_name AS displayName FROM account_challenges
    WHERE token_hash = ? AND kind = ? AND expires_at > ?`).get(tokenHash(token), kind, now) as Challenge | undefined;
  if (!challenge) throw challengeExpired();
  if (kind === "verify") requireApprovedAccountEmail(challenge.email);
  return challenge;
}

export function checkChallenge(kind: ChallengeKind, token: string): void {
  requireChallenge(accountDb(), kind, token, Date.now());
}

export function consumeChallenge(kind: ChallengeKind, token: string, passwordHash: string): void {
  const db = accountDb();
  accountTransaction(db, () => {
    const now = Date.now();
    const challenge = requireChallenge(db, kind, token, now);
    if (kind === "verify") {
      if (!challenge.displayName || credentialsIn(db, challenge.email)) throw challengeExpired();
      db.prepare("INSERT INTO account_users VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(randomUUID(), challenge.email, challenge.displayName, passwordHash, now, now, now);
    } else {
      if (!challenge.userId) throw challengeExpired();
      db.prepare("UPDATE account_users SET password_hash = ?, updated_at = ? WHERE id = ?")
        .run(passwordHash, now, challenge.userId);
      db.prepare("DELETE FROM account_sessions WHERE user_id = ?").run(challenge.userId);
    }
    db.prepare("DELETE FROM account_challenges WHERE email = ? AND kind = ?").run(challenge.email, kind);
  });
}

function checkAccount(user: AccountUser | null, expected: unknown): void {
  if (user && user.id !== expected) throw new AccountError(409, "Аккаунт в этой вкладке изменился. Обнови страницу.");
}

export function revokeSession(token: unknown, expected: unknown): void {
  if (!validToken(token)) return;
  const db = accountDb();
  accountTransaction(db, () => {
    checkAccount(sessionIn(db, token, Date.now()), expected);
    db.prepare("DELETE FROM account_sessions WHERE token_hash = ?").run(tokenHash(token));
  });
}

export function updateDisplayName(token: unknown, expected: unknown, displayName: string): void {
  const unauthenticated = () => new AccountError(401, "Войди в аккаунт, чтобы изменить профиль.");
  if (!validToken(token)) throw unauthenticated();
  const db = accountDb();
  accountTransaction(db, () => {
    const now = Date.now();
    const user = sessionIn(db, token, now);
    if (!user) throw unauthenticated();
    checkAccount(user, expected);
    db.prepare("UPDATE account_users SET display_name = ?, updated_at = ? WHERE id = ?").run(displayName, now, user.id);
  });
}

export function canUseAiChat(userId: string): boolean {
  return Boolean(accountDb().prepare(`SELECT 1 FROM account_entitlements AS e
    JOIN account_users AS u ON u.id = e.user_id
    WHERE u.id = ? AND u.email_verified_at > 0 AND e.capability = 'ai_chat'`).get(userId));
}
