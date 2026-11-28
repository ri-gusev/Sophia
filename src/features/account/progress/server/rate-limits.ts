import { AccountError } from "../../server/errors.ts";

const windowMs = 60_000;
const limits = {
  read: { global: 240, network: 90, account: 45 },
  write: { global: 120, network: 45, account: 30 },
} as const;

function windowCounters() {
  return { expires: 0, total: 0, networks: new Map<string, number>(), accounts: new Map<string, number>() };
}

const windows = { read: windowCounters(), write: windowCounters() };

export function limitProgressRequests(operation: keyof typeof limits, network: string, account: string, now = performance.now()): void {
  const current = windows[operation];
  if (current.expires <= now) {
    current.expires = now + windowMs;
    current.total = 0;
    current.networks.clear();
    current.accounts.clear();
  }
  const limit = limits[operation];
  const networkCount = current.networks.get(network) ?? 0;
  const accountCount = current.accounts.get(account) ?? 0;
  if (current.total >= limit.global || networkCount >= limit.network || accountCount >= limit.account) {
    throw new AccountError(429, "Слишком много запросов. Попробуй чуть позже.", Math.ceil((current.expires - now) / 1000));
  }
  // The global limit also bounds the number of unique keys retained in each window.
  current.total++;
  current.networks.set(network, networkCount + 1);
  current.accounts.set(account, accountCount + 1);
}
