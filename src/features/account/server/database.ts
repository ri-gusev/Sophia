import { closeSync, mkdirSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { ACCOUNT_PROGRESS_SCHEMA } from "../progress/server/schema.ts";
import { ACCOUNT_LEGAL_SCHEMA } from "../../legal/server/schema.ts";
import { accountSettings } from "./config.ts";

const APPLICATION_ID = 0x534f5048;
const MIGRATIONS = [
  `CREATE TABLE account_users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified_at INTEGER NOT NULL CHECK (email_verified_at > 0),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT;
  CREATE TABLE account_sessions (
    token_hash TEXT PRIMARY KEY NOT NULL CHECK (length(token_hash) = 64),
    user_id TEXT NOT NULL REFERENCES account_users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL CHECK (expires_at > created_at)
  ) STRICT;
  CREATE INDEX account_sessions_user ON account_sessions(user_id);
  CREATE INDEX account_sessions_expiry ON account_sessions(expires_at);
  CREATE TABLE account_challenges (
    token_hash TEXT PRIMARY KEY NOT NULL CHECK (length(token_hash) = 64),
    kind TEXT NOT NULL CHECK (kind IN ('verify', 'reset')),
    email TEXT NOT NULL,
    user_id TEXT REFERENCES account_users(id) ON DELETE CASCADE,
    display_name TEXT,
    expires_at INTEGER NOT NULL,
    CHECK ((kind = 'verify' AND user_id IS NULL AND display_name IS NOT NULL) OR
      (kind = 'reset' AND user_id IS NOT NULL AND display_name IS NULL))
  ) STRICT;
  CREATE INDEX account_challenges_email ON account_challenges(email, kind);
  CREATE INDEX account_challenges_expiry ON account_challenges(expires_at);
  CREATE TABLE account_rate_limits (
    bucket TEXT PRIMARY KEY NOT NULL,
    attempts INTEGER NOT NULL CHECK (attempts > 0),
    expires_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX account_rate_limits_expiry ON account_rate_limits(expires_at);
  CREATE TABLE account_entitlements (
    user_id TEXT NOT NULL REFERENCES account_users(id) ON DELETE CASCADE,
    capability TEXT NOT NULL,
    granted_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, capability)
  ) STRICT;`,
  ACCOUNT_PROGRESS_SCHEMA,
  ACCOUNT_LEGAL_SCHEMA,
];

export function accountTransaction<T>(db: DatabaseSync, run: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = run();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Preserve the original transaction error if SQLite already rolled it back.
    }
    throw error;
  }
}

function createEmptyFile(path: string) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  try {
    closeSync(openSync(path, "wx", 0o600));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
  }
}

export function openAccountDatabase(path: string, create = false): DatabaseSync {
  const configuredLedger = process.env.CHAT_LEDGER_PATH;
  const ledger = configuredLedger
    ? resolve(/* turbopackIgnore: true */ configuredLedger)
    : resolve("storage/chat/ledger.sqlite");
  if (resolve(/* turbopackIgnore: true */ path) === ledger) throw new Error("The accounts database must use a separate file.");
  if (create) createEmptyFile(path);
  const db = new DatabaseSync(`${pathToFileURL(path).href}?mode=rw`, { timeout: 250 });
  try {
    db.exec("PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON");
    accountTransaction(db, () => {
      const application = db.prepare("PRAGMA application_id").get()?.application_id;
      const version = Number(db.prepare("PRAGMA user_version").get()?.user_version);
      if (application === 0 && version === 0 && !db.prepare("SELECT 1 FROM sqlite_schema LIMIT 1").get()) {
        db.exec(`PRAGMA application_id = ${APPLICATION_ID}`);
      } else if (application !== APPLICATION_ID || version > MIGRATIONS.length || version < 0) {
        throw new Error("Unrecognized accounts database schema.");
      }
      for (let index = version; index < MIGRATIONS.length; index++) {
        db.exec(MIGRATIONS[index]);
        db.exec(`PRAGMA user_version = ${index + 1}`);
      }
    });
    db.exec("PRAGMA journal_mode = WAL; PRAGMA trusted_schema = OFF");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

let connection: { path: string; db: DatabaseSync } | undefined;

export function accountDb(): DatabaseSync {
  const { path, mode } = accountSettings();
  if (connection?.path !== path) {
    const db = openAccountDatabase(path, mode === "local");
    connection?.db.close();
    connection = { path, db };
  }
  return connection.db;
}
