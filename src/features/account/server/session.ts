import { cookies } from "next/headers";
import type { AccountUser } from "../account-contract.ts";
import { accountSettings } from "./config.ts";
import { findSession } from "./store.ts";

export { canUseAiChat } from "./store.ts";

export async function readSession(): Promise<AccountUser | null> {
  const jar = await cookies();
  if (!jar.has("__Host-sophia-session") && !jar.has("sophia-session")) return null;
  return findSession(jar.get(accountSettings().cookieName)?.value);
}
