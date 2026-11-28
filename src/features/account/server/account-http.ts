import { ACCOUNT_LIMITS, isLoginPassword, normalizeDisplayName, normalizeEmail, passwordPairError } from "../account-contract.ts";
import { confirmationKinds } from "../../legal/contract.ts";
import { requireLegalConfirmations, requireLegalRegistration, submittedMailingConsent } from "../../legal/server/revisions.ts";
import { accountSettings } from "./config.ts";
import { hashPassword, matchesPassword, validToken } from "./credentials.ts";
import { AccountError, accountUnavailable } from "./errors.ts";
import { identifyAccountNetwork, readJson, verifyOrigin } from "./http.ts";
import { accountMailTransport } from "./mail.ts";
import { limitAccountRequests } from "./rate-limits.ts";
import {
  ACCOUNT_SESSION_AGE, challengeExpired, checkChallenge, consumeChallenge, credentialsForEmail, deleteChallenge,
  eraseAccount, invalidLogin, issueChallenge, replaceSession, requireApprovedAccountEmail, revokeSession, updateDisplayName,
  setProfileMailingConsent,
} from "./store.ts";

const fields = {
  register: ["displayName", "email", ...confirmationKinds, "legalVersions", "mailingConsentVersion"],
  "resend-verification": ["email"],
  login: ["email", "password"],
  logout: ["accountId"],
  verify: ["token", "password", "confirmPassword", ...confirmationKinds, "legalVersions", "mailingConsentVersion"],
  forgot: ["email"],
  reset: ["token", "password", "confirmPassword"],
  profile: ["displayName", "accountId"],
  "delete-account": ["accountId", "password", "confirm"],
  "withdraw-consent": ["accountId", "password", "confirm"],
  "withdraw-mailing-consent": ["accountId"],
  "grant-mailing-consent": ["accountId", "mailingConsentVersion"],
} satisfies Record<string, string[]>;

type Action = keyof typeof fields;
type Defer = (callback: () => Promise<void>) => void;

function isAction(value: string): value is Action {
  return Object.hasOwn(fields, value);
}

function ok(cookie?: string): Response {
  const headers = new Headers({ "cache-control": "no-store" });
  if (cookie !== undefined) headers.set("set-cookie", cookie);
  return Response.json({ ok: true }, { headers });
}

function sessionCookie(token: string) {
  const { cookieName, secure } = accountSettings();
  const maxAge = token ? ACCOUNT_SESSION_AGE / 1000 : 0;
  return `${cookieName}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function emailField(value: unknown, maxLength?: number) {
  const email = normalizeEmail(value, maxLength);
  if (!email) throw new AccountError(400, maxLength ? `Введи корректный email до ${maxLength} символов.` : "Введи корректный email.");
  return email;
}

function nameField(value: unknown) {
  const name = normalizeDisplayName(value);
  if (!name) throw new AccountError(400, `Введи имя длиной от 1 до ${ACCOUNT_LIMITS.inputMax} символов.`);
  return name;
}

function passwordField(body: Record<string, unknown>) {
  const message = passwordPairError(body.password, body.confirmPassword);
  if (message || typeof body.password !== "string") throw new AccountError(400, message ?? "Введи пароль.");
  return body.password;
}

function mailLink(kind: "verify" | "reset", token: string): string {
  const { origin } = accountSettings();
  return `${origin}${kind === "verify" ? "/verify-email" : "/reset-password"}#token=${token}`;
}

async function sendChallenge(kind: "verify" | "reset", email: string, send: ReturnType<typeof accountMailTransport>, token: string) {
  try {
    await send({ to: email, kind, url: mailLink(kind, token) });
  } catch {
    try {
      // Preserve the pending registration so resend can issue a new link.
      if (kind === "reset") deleteChallenge(token);
    } catch {
      console.error("Could not remove failed account email challenge");
    }
    console.error(`Account email delivery failed (${kind})`);
  }
}

const mailPending = { verify: 0, reset: 0 };

function deferChallenge(defer: Defer, kind: "verify" | "reset", email: string,
  send: ReturnType<typeof accountMailTransport>, issue: () => string | null) {
  if (mailPending[kind] >= 8) throw new AccountError(429, "Слишком много запросов. Попробуй чуть позже.", 10);
  mailPending[kind]++;
  try {
    defer(async () => {
      try {
        const token = issue();
        if (token) await sendChallenge(kind, email, send, token);
      } catch (error) {
        if (!(error instanceof AccountError)) console.error(`Could not prepare account email (${kind})`);
      } finally {
        mailPending[kind]--;
      }
    });
  } catch (error) {
    mailPending[kind]--;
    throw error;
  }
}

async function execute(action: Action, body: Record<string, unknown>, network: string, sessionToken: string | undefined, defer: Defer) {
  switch (action) {
    case "register": {
      const email = emailField(body.email, ACCOUNT_LIMITS.inputMax);
      requireApprovedAccountEmail(body.email);
      const displayName = nameField(body.displayName);
      const revisions = requireLegalConfirmations(body);
      const mailingConsent = submittedMailingConsent(body.mailingConsentVersion);
      const send = accountMailTransport();
      limitAccountRequests(action, network, email);
      deferChallenge(defer, "verify", email, send, () =>
        issueChallenge("verify", email, { displayName, revisions, mailingConsent }));
      return ok();
    }
    case "login": {
      const email = emailField(body.email);
      if (!isLoginPassword(body.password)) throw invalidLogin();
      const credentials = credentialsForEmail(email);
      if (!await matchesPassword(body.password, credentials?.passwordHash, () => limitAccountRequests(action, network, email)) ||
          !credentials) throw invalidLogin();
      return ok(sessionCookie(replaceSession(email, credentials, sessionToken)));
    }
    case "logout":
      revokeSession(sessionToken, body.accountId);
      return ok(sessionCookie(""));
    case "profile":
      updateDisplayName(sessionToken, body.accountId, nameField(body.displayName));
      return ok();
    case "withdraw-mailing-consent":
      setProfileMailingConsent(sessionToken, body.accountId, null);
      return ok();
    case "grant-mailing-consent": {
      const consent = submittedMailingConsent(body.mailingConsentVersion);
      if (!consent) throw new AccountError(400, "Подтверди согласие на рассылки.");
      setProfileMailingConsent(sessionToken, body.accountId, consent);
      return ok();
    }
    case "delete-account":
    case "withdraw-consent":
      if (body.confirm !== true) throw new AccountError(400, "Подтверди удаление аккаунта.");
      if (!isLoginPassword(body.password)) throw new AccountError(400, "Укажи текущий пароль.");
      await eraseAccount(sessionToken, body.accountId, body.password, network);
      return ok(sessionCookie(""));
    case "forgot":
    case "resend-verification": {
      const email = emailField(body.email);
      const recovery = action === "forgot";
      if (!recovery) {
        requireApprovedAccountEmail(body.email);
        requireLegalRegistration();
      }
      const send = accountMailTransport();
      const kind = recovery ? "reset" : "verify";
      limitAccountRequests(recovery ? "forgot" : "register", network, email);
      deferChallenge(defer, kind, email, send, () => issueChallenge(kind, email));
      return ok();
    }
    case "verify":
    case "reset": {
      const password = passwordField(body);
      if (action === "verify") requireLegalConfirmations(body);
      const mailingConsent = action === "verify" ? submittedMailingConsent(body.mailingConsentVersion) : null;
      limitAccountRequests(action, network);
      if (!validToken(body.token)) throw challengeExpired();
      checkChallenge(action, body.token);
      consumeChallenge(action, body.token, await hashPassword(password), mailingConsent);
      return ok();
    }
  }
}

export async function handleAccountRequest(
  request: Request, action: string, getCookie: (name: string) => string | undefined, defer: Defer,
): Promise<Response> {
  try {
    if (!isAction(action)) throw new AccountError(404, "Действие недоступно.");
    verifyOrigin(request);
    const network = identifyAccountNetwork(request);
    const body = await readJson(request);
    if (Object.keys(body).some(key => !fields[action].includes(key))) throw new AccountError(400, "Проверь данные запроса.");
    return await execute(action, body, network, getCookie(accountSettings().cookieName), defer);
  } catch (error) {
    if (!request.body?.locked) void request.body?.cancel().catch(() => undefined);
    if (!(error instanceof AccountError)) console.error("Account request failed");
    const failure = error instanceof AccountError ? error : accountUnavailable();
    if (failure.status === 429 && (action === "login" || action === "forgot" || action === "grant-mailing-consent")) {
      console.warn(`Account request rate limited (${action})`);
    }
    const headers = new Headers({ "cache-control": "no-store" });
    if (failure.retryAfter) headers.set("retry-after", String(failure.retryAfter));
    return Response.json({ error: failure.message }, { status: failure.status, headers });
  }
}
