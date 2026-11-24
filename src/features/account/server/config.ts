import { isAbsolute, resolve } from "node:path";
import { accountUnavailable } from "./errors.ts";

export function accountSettings() {
  const { ACCOUNT_MODE, ACCOUNT_ORIGIN, ACCOUNT_DB_PATH, ACCOUNT_MAIL_TRANSPORT, ACCOUNT_TEST_OUTBOX, NODE_ENV } = process.env;
  const mode = ACCOUNT_MODE ?? (NODE_ENV === "production" ? undefined : "local");
  if (mode !== "local" && mode !== "proxy") throw accountUnavailable();

  const origin = ACCOUNT_ORIGIN ?? (mode === "local" && NODE_ENV !== "production" ? "http://127.0.0.1:3000" : "");
  const url = URL.parse(origin);
  if (url?.origin !== origin) throw accountUnavailable();
  if (mode === "local") {
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !["http:", "https:"].includes(url.protocol)) {
      throw accountUnavailable();
    }
    if (NODE_ENV === "production" && (ACCOUNT_MAIL_TRANSPORT !== "test" || !ACCOUNT_DB_PATH || !ACCOUNT_TEST_OUTBOX ||
      !isAbsolute(ACCOUNT_DB_PATH) || !isAbsolute(ACCOUNT_TEST_OUTBOX))) throw accountUnavailable();
  } else if (url.protocol !== "https:" || !ACCOUNT_DB_PATH || !isAbsolute(ACCOUNT_DB_PATH)) {
    throw accountUnavailable();
  }

  const path = ACCOUNT_DB_PATH
    ? resolve(/* turbopackIgnore: true */ ACCOUNT_DB_PATH)
    : resolve("storage/accounts/accounts.sqlite");
  const secure = url.protocol === "https:";
  return { mode, origin, path, secure, cookieName: secure ? "__Host-sophia-session" : "sophia-session" };
}
