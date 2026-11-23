import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { isAbsolute, resolve } from "node:path";
import { ChatError } from "../chat-contract.ts";

export const unavailable = () => new ChatError(503, "Разговор временно недоступен. Попробуйте позже.");
export const forbidden = () => new ChatError(403, "Этот запрос недоступен.");

function clientNetwork(address: string): string {
  if (isIP(address) === 4) return address;
  if (isIP(address) !== 6 || address.includes("%")) throw unavailable();

  const [left, right] = new URL("http://[" + address + "]").hostname.slice(1, -1).split("::");
  const start = left ? left.split(":") : [];
  const end = right ? right.split(":") : [];
  const parts = right === undefined ? start : [...start, ...Array<string>(8 - start.length - end.length).fill("0"), ...end];
  if (parts.slice(0, 5).every(part => part === "0") && parts[5] === "ffff") {
    return parts.slice(6).flatMap(part => [parseInt(part, 16) >> 8, parseInt(part, 16) & 255]).join(".");
  }
  return parts.slice(0, 4).join(":") + "::/64";
}

export function proxyClient(headers: Headers, secret: string): string {
  const token = headers.get("x-sophia-proxy-token");
  const expected = Buffer.from(secret);
  const supplied = Buffer.from(token ?? "");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw unavailable();
  const network = clientNetwork(headers.get("x-sophia-client-ip") ?? "");
  return createHmac("sha256", secret).update("anonymous:" + network).digest("hex");
}

type Environment = Record<string, string | undefined>;

function integer(env: Environment, key: string, fallback: number, max = 10000) {
  const value = env[key] ?? String(fallback);
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw unavailable();
  return Number(value);
}

function budget(env: Environment, key: string, localDefault: string | undefined) {
  const value = env[key] ?? localDefault;
  if (!value || !/^\d{1,6}(?:\.\d{1,6})?$/.test(value) || Number(value) <= 0) throw unavailable();
  return Math.round(Number(value) * 1_000_000_000);
}

export function chatSettings(env: Environment = process.env) {
  const mode = env.CHAT_ACCESS_MODE;
  if (mode !== "local" && mode !== "proxy") throw unavailable();
  const secret = env.CHAT_PROXY_SECRET ?? "";
  const path = env.CHAT_LEDGER_PATH ?? (mode === "local" ? resolve("storage/chat/ledger.sqlite") : "");
  const origins = (env.CHAT_ALLOWED_ORIGINS ?? "").split(",").map(value => value.trim());
  const originSet = new Set(origins);
  if (mode === "proxy" && (!/^[A-Fa-f0-9]{64}$/.test(secret) || !isAbsolute(path))) throw unavailable();
  for (const origin of origins) {
    const parsed = URL.parse(origin);
    if (!parsed || parsed.origin !== origin || (mode === "proxy" ? parsed.protocol !== "https:" :
      !["http:", "https:"].includes(parsed.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname))) throw unavailable();
  }

  const limits = {
    globalMinute: integer(env, "CHAT_GLOBAL_PER_MINUTE", 20),
    globalActive: integer(env, "CHAT_GLOBAL_CONCURRENT", 2, 100),
    clientMinute: integer(env, "CHAT_CLIENT_PER_MINUTE", 5),
    clientDay: integer(env, "CHAT_CLIENT_PER_DAY", 40),
    clientActive: integer(env, "CHAT_CLIENT_CONCURRENT", 1, 99),
    clientBurst: integer(env, "CHAT_CLIENT_BURST", 2),
    paidActive: integer(env, "CHAT_PAID_CONCURRENT", 2, 100),
    turn: budget(env, "CHAT_MAX_TURN_USD", mode === "local" ? "1.85" : undefined),
    day: budget(env, "CHAT_DAY_BUDGET_USD", mode === "local" ? "5" : undefined),
    month: budget(env, "CHAT_MONTH_BUDGET_USD", mode === "local" ? "20" : undefined),
  };
  if (limits.clientMinute >= limits.globalMinute || limits.clientActive >= limits.globalActive ||
      limits.clientActive >= limits.paidActive || limits.clientBurst > limits.clientMinute ||
      limits.turn > limits.day || limits.day > limits.month) throw unavailable();

  return {
    path, limits, originSet, createLedger: mode === "local",
    identify: (request: Request) => mode === "proxy" ? proxyClient(request.headers, secret) : "local",
  };
}
