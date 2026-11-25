import type { DatabaseSync } from "node:sqlite";
import { accountDb, accountTransaction } from "./database.ts";

const DAY = 24 * 60 * 60_000;
const RETRY = 60_000;

export function cleanupAccounts(db: DatabaseSync, { now = Date.now(), force = false } = {}): number {
  const next = accountTransaction(db, () => {
    const last = db.prepare("SELECT completed_at FROM account_cleanup WHERE id = 1").get()?.completed_at;
    if (!force && typeof last === "number" && last <= now && last + DAY > now) return last + DAY;
    db.prepare("DELETE FROM account_sessions WHERE expires_at <= ?").run(now);
    db.prepare("DELETE FROM account_challenges WHERE expires_at <= ?").run(now);
    db.prepare("DELETE FROM account_rate_limits WHERE expires_at <= ?").run(now);
    db.prepare("DELETE FROM account_registrations WHERE expires_at <= ?").run(now);
    db.prepare(`INSERT INTO account_cleanup VALUES (1, ?)
      ON CONFLICT(id) DO UPDATE SET completed_at = excluded.completed_at`).run(now);
    return now + DAY;
  });
  // Retry checkpointing even if the row deletion committed before a reader released its snapshot.
  if (db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get()?.busy !== 0) {
    throw new Error("The SQLite write-ahead log is busy");
  }
  return next;
}

export function startAccountCleanup(): void {
  function run() {
    let delay = RETRY;
    try {
      delay = Math.max(1_000, cleanupAccounts(accountDb()) - Date.now());
    } catch {
      console.error("Account data cleanup failed");
    }
    setTimeout(run, delay).unref();
  }
  run();
}
