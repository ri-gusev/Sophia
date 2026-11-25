import { tokenHash } from "./credentials.ts";
import { accountDb, accountTransaction } from "./database.ts";
import { AccountError } from "./errors.ts";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const limits = {
  register: { duration: HOUR, global: 60, network: 12, email: 3, daily: 240 },
  login: { duration: 15 * MINUTE, global: 300, network: 35, email: 6 },
  verify: { duration: 15 * MINUTE, global: 150, network: 20 },
  forgot: { duration: HOUR, global: 60, network: 10, email: 3, daily: 240 },
  reset: { duration: 15 * MINUTE, global: 150, network: 20 },
  erase: { duration: 15 * MINUTE, global: 150, network: 20, email: 6 },
} as const;

export function limitAccountRequests(action: keyof typeof limits, network: string, identity?: string): void {
  const limit = limits[action];
  const buckets: { key: string; max: number; ttl: number }[] = [
    { key: `${action}:global`, max: limit.global, ttl: limit.duration },
    { key: `${action}:network:${network}`, max: limit.network, ttl: limit.duration },
  ];
  if (identity && "email" in limit) buckets.push({ key: `${action}:email:${tokenHash(identity)}`, max: limit.email, ttl: limit.duration });
  if ("daily" in limit) buckets.push({ key: `${action}:global:daily`, max: limit.daily, ttl: 24 * HOUR });

  const db = accountDb();
  accountTransaction(db, () => {
    const now = Date.now();
    db.prepare("DELETE FROM account_rate_limits WHERE expires_at <= ?").run(now);
    const get = db.prepare("SELECT attempts, expires_at FROM account_rate_limits WHERE bucket = ?");
    let retryAfter = 0;
    for (const bucket of buckets) {
      const row = get.get(bucket.key);
      if (row && Number(row.attempts) >= bucket.max) retryAfter = Math.max(retryAfter, Math.ceil((Number(row.expires_at) - now) / 1000));
    }
    if (retryAfter) throw new AccountError(429, "Слишком много запросов. Попробуй чуть позже.", retryAfter);

    const use = db.prepare(`INSERT INTO account_rate_limits(bucket, attempts, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1`);
    for (const bucket of buckets) use.run(bucket.key, now + bucket.ttl);
  });
}
