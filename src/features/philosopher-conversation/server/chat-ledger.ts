import { randomUUID } from "node:crypto";
import { mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { ChatError } from "../chat-contract.ts";
import { unavailable } from "./chat-access.ts";

const minute = 60_000;
const day = 86_400_000;
const burstWindow = 5_000;
const requestLease = 120_000;
const paidLease = 420_000;

export type ChatLimits = {
  globalMinute: number; globalActive: number; clientMinute: number; clientDay: number;
  clientActive: number; clientBurst: number; paidActive: number; turn: number; day: number; month: number;
};

function denied(now: number, retryAt: number) {
  return new ChatError(429, "Сейчас слишком много запросов. Попробуйте позже.", Math.max(1, Math.ceil((retryAt - now) / 1000)));
}

const budgetExceeded = () => new ChatError(503, "Лимит расходов на разговор исчерпан. Попробуйте позже.");

export function createChatLedger(path: string, limits: ChatLimits, now = Date.now, create = false) {
  let connection: DatabaseSync | undefined;
  let fileId: string | undefined;

  function identity() {
    const stat = statSync(path, { bigint: true });
    if (!stat.isFile()) throw new Error("Expected ledger file");
    return `${stat.dev}:${stat.ino}`;
  }

  function open() {
    if (connection) {
      if (identity() !== fileId) throw new Error("Ledger file changed");
      return connection;
    }
    if (create) mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    else fileId = identity();
    // URI mode=rw prevents SQLite from recreating a missing production ledger.
    const database = new DatabaseSync(create ? path : pathToFileURL(path).href + "?mode=rw", { timeout: 100 });
    try {
      if (database.prepare("PRAGMA journal_mode = WAL").get()?.journal_mode !== "wal") throw new Error("WAL unavailable");
      database.exec(`
        PRAGMA synchronous = FULL;
        CREATE TABLE IF NOT EXISTS chat_requests (
          id TEXT PRIMARY KEY, client TEXT NOT NULL, started INTEGER NOT NULL, active_until INTEGER NOT NULL
        ) STRICT;
        CREATE INDEX IF NOT EXISTS chat_requests_started ON chat_requests(started);
        CREATE INDEX IF NOT EXISTS chat_requests_client ON chat_requests(client, started);
        CREATE INDEX IF NOT EXISTS chat_requests_active ON chat_requests(active_until);
        CREATE TABLE IF NOT EXISTS chat_spend (
          id TEXT PRIMARY KEY, client TEXT, reserved INTEGER NOT NULL, spent INTEGER, booked INTEGER NOT NULL,
          active_until INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0
        ) STRICT;
        CREATE INDEX IF NOT EXISTS chat_spend_booked ON chat_spend(booked);
        CREATE INDEX IF NOT EXISTS chat_spend_active ON chat_spend(active_until);
      `);
      const openedId = identity();
      if (!create && fileId !== openedId) throw new Error("Ledger file changed");
      fileId = openedId;
    } catch (error) {
      database.close();
      throw error;
    }
    connection = database;
    return database;
  }

  function transaction<T>(run: (db: DatabaseSync, time: number) => T): T {
    try {
      const db = open();
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = run(db, now());
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    } catch (error) {
      if (error instanceof ChatError) throw error;
      console.warn(JSON.stringify({ event: "plato_ledger_unavailable" }));
      throw unavailable();
    }
  }

  function admit(client: string) {
    const id = randomUUID();
    transaction((db, time) => {
      const dayStart = Math.floor(time / day) * day;
      db.prepare("DELETE FROM chat_requests WHERE started < ? AND active_until <= ?").run(dayStart - minute, time);
      const global = db.prepare("SELECT started FROM chat_requests WHERE started > ? ORDER BY started").all(time - minute);
      const personal = db.prepare("SELECT started FROM chat_requests WHERE client = ? AND started >= ? ORDER BY started").all(client, Math.min(dayStart, time - minute));
      const active = db.prepare("SELECT client, active_until FROM chat_requests WHERE active_until > ? ORDER BY active_until").all(time);
      const activeClient = active.filter(row => row.client === client);
      const dates = personal.map(row => Number(row.started));
      const recent = dates.filter(start => start > time - minute);
      const bursts = dates.filter(start => start > time - burstWindow);
      const retryAt = Math.max(
        Number(global.at(-limits.globalMinute)?.started ?? -Infinity) + minute,
        (recent.at(-limits.clientMinute) ?? -Infinity) + minute,
        (bursts.at(-limits.clientBurst) ?? -Infinity) + burstWindow,
        dates.filter(start => start >= dayStart).length >= limits.clientDay ? dayStart + day : -Infinity,
        Number(active.at(-limits.globalActive)?.active_until ?? -Infinity),
        Number(activeClient.at(-limits.clientActive)?.active_until ?? -Infinity),
      );
      if (retryAt > time) throw denied(time, retryAt);
      db.prepare("INSERT INTO chat_requests VALUES (?, ?, ?, ?)").run(id, client, time, time + requestLease);
    });
    let released = false;
    return () => {
      if (released) return;
      released = true;
      transaction(db => { db.prepare("UPDATE chat_requests SET active_until = 0 WHERE id = ?").run(id); });
    };
  }

  function reserve(client: string, amount: number) {
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > limits.turn) throw budgetExceeded();
    const id = randomUUID();
    transaction((db, time) => {
      const date = new Date(time);
      const dayStart = Math.floor(time / day) * day;
      const monthStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
      const previousMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1);
      db.prepare("UPDATE chat_spend SET spent = reserved, booked = active_until WHERE spent IS NULL AND active_until <= ?").run(time);
      db.prepare("UPDATE chat_spend SET client = NULL WHERE client IS NOT NULL AND active_until <= ?").run(time);
      db.prepare("DELETE FROM chat_spend WHERE booked < ? AND spent IS NOT NULL AND active_until <= ?").run(previousMonth, time);
      const active = db.prepare("SELECT client, active_until FROM chat_spend WHERE active_until > ? ORDER BY active_until").all(time);
      const retryAt = Math.max(
        Number(active.at(-limits.paidActive)?.active_until ?? -Infinity),
        Number(active.filter(row => row.client === client).at(-limits.clientActive)?.active_until ?? -Infinity),
      );
      if (retryAt > time) throw denied(time, retryAt);
      const sum = db.prepare("SELECT coalesce(sum(coalesce(spent, reserved)), 0) AS total FROM chat_spend WHERE booked >= ? OR spent IS NULL");
      if (Number(sum.get(dayStart)?.total) + amount > limits.day || Number(sum.get(monthStart)?.total) + amount > limits.month) throw budgetExceeded();
      db.prepare("INSERT INTO chat_spend (id, client, reserved, booked, active_until) VALUES (?, ?, ?, ?, ?)").run(id, client, amount, time, time + paidLease);
    });
    return {
      startOperation() {
        transaction((db, time) => {
          const result = db.prepare("UPDATE chat_spend SET attempts = attempts + 1 WHERE id = ? AND spent IS NULL AND active_until > ?").run(id, time);
          if (!result.changes) throw unavailable();
        });
      },
      settle(spent: number, uncertain: boolean) {
        transaction((db, time) => {
          const result = db.prepare(`
            UPDATE chat_spend SET spent = ?, booked = ?, active_until = CASE WHEN ? THEN active_until ELSE 0 END,
              client = CASE WHEN ? THEN client ELSE NULL END
            WHERE id = ? AND spent IS NULL AND active_until > ?
          `).run(spent, time, Number(uncertain), Number(uncertain), id, time);
          if (!result.changes) throw unavailable();
        });
      },
    };
  }

  return { admit, reserve, close: () => { connection?.close(); connection = undefined; } };
}
