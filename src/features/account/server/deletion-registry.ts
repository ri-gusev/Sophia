import { randomUUID } from "node:crypto";
import { closeSync, openSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { accountSettings } from "./config.ts";
import { accountTransaction } from "./database.ts";

const APPLICATION_ID = 0x534f444c;
const RETENTION_MS = 14 * 24 * 60 * 60_000;
export type DeletionReason = "self" | "withdrawal" | "operator";

export function deletionRegistryPath() {
  const { path, mode } = accountSettings();
  const configured = process.env.ACCOUNT_DELETION_REGISTRY_PATH;
  if (configured && isAbsolute(configured)) return resolve(/* turbopackIgnore: true */ configured);
  if (configured !== undefined || mode !== "local") throw new Error("Set an absolute deletion registry path.");
  return path + ".deletions.sqlite";
}

export function assertSeparateFiles(accountPath: string, registryPath: string) {
  if (resolve(/* turbopackIgnore: true */ accountPath) === resolve(/* turbopackIgnore: true */ registryPath)) {
    throw new Error("The deletion registry must be separate from the account database.");
  }
  const account = statSync(accountPath);
  const registry = statSync(registryPath, { throwIfNoEntry: false });
  if (registry?.ino && registry.ino === account.ino && registry.dev === account.dev) {
    throw new Error("The deletion registry must be separate from the account database.");
  }
}

export function openDeletionRegistry(path: string, readOnly = true) {
  const info = statSync(path);
  if (!info.isFile() || (process.platform !== "win32" && (info.mode & 0o077) !== 0)) {
    throw new Error("The deletion registry must be a private file.");
  }
  const db = new DatabaseSync(`${pathToFileURL(path).href}?mode=${readOnly ? "ro" : "rw"}`, { readOnly, timeout: 250 });
  try {
    if (db.prepare("PRAGMA application_id").get()?.application_id !== APPLICATION_ID ||
      db.prepare("PRAGMA user_version").get()?.user_version !== 1) throw new Error("Unknown deletion registry schema.");
    db.exec("PRAGMA trusted_schema = OFF");
    if (!readOnly) db.exec("PRAGMA synchronous = EXTRA; PRAGMA secure_delete = ON");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function deletionHead(db: DatabaseSync) {
  const row = db.prepare("SELECT registry_id, sequence, floor FROM account_deletion_head WHERE id = 1").get();
  if (typeof row?.registry_id !== "string" || typeof row.sequence !== "number" || typeof row.floor !== "number" ||
    !Number.isSafeInteger(row.sequence) || !Number.isSafeInteger(row.floor) || row.floor < 0 || row.sequence < row.floor) {
    throw new Error("Missing or invalid deletion registry head.");
  }
  return { id: row.registry_id, sequence: row.sequence, floor: row.floor };
}

export function accountDeletionBinding(db: DatabaseSync) {
  const row = db.prepare("SELECT registry_id, required_sequence FROM account_deletion_binding WHERE id = 1").get();
  if (typeof row?.registry_id !== "string" || typeof row.required_sequence !== "number" ||
    !Number.isSafeInteger(row.required_sequence) || row.required_sequence < 0) {
    throw new Error("Account database is not bound to a deletion registry.");
  }
  return { id: row.registry_id, sequence: row.required_sequence };
}

export function initializeDeletionRegistry(accounts: DatabaseSync, accountPath: string, registryPath: string) {
  return accountTransaction(accounts, () => {
    assertSeparateFiles(accountPath, registryPath);
    if (accounts.prepare("SELECT 1 FROM account_deletion_binding WHERE id = 1").get()) {
      const binding = accountDeletionBinding(accounts);
      const head = deletionRegistryStatus(registryPath);
      if (binding.id !== head.id || binding.sequence > head.sequence) throw new Error("Deletion registry binding mismatch.");
      return head;
    }
    // An existing file must never be rebound to a different database, even after a failed initialization.
    closeSync(openSync(registryPath, "wx", 0o600));
    using registry = new DatabaseSync(`${pathToFileURL(registryPath).href}?mode=rw`);
    registry.exec("PRAGMA journal_mode = DELETE; PRAGMA synchronous = EXTRA");
    const id = randomUUID();
    accountTransaction(registry, () => {
      registry.exec(`PRAGMA application_id = ${APPLICATION_ID}; PRAGMA user_version = 1;
        CREATE TABLE account_deletion_head (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          registry_id TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          floor INTEGER NOT NULL
        ) STRICT;
        CREATE TABLE account_deletion_events (
          sequence INTEGER PRIMARY KEY,
          account_id TEXT NOT NULL UNIQUE,
          recorded_at INTEGER NOT NULL,
          reason TEXT NOT NULL CHECK (reason IN ('self', 'withdrawal', 'operator'))
        ) STRICT;`);
      registry.prepare("INSERT INTO account_deletion_head VALUES (1, ?, 0, 0)").run(id);
    });
    accounts.prepare("INSERT INTO account_deletion_binding VALUES (1, ?, 0)").run(id);
    return { id, sequence: 0, floor: 0 };
  });
}

export function openRegistryForDeletion(accounts: DatabaseSync) {
  const { mode, path } = accountSettings();
  const registryPath = deletionRegistryPath();
  if (mode === "local" && process.env.ACCOUNT_DELETION_REGISTRY_PATH === undefined &&
    !accounts.prepare("SELECT 1 FROM account_deletion_binding WHERE id = 1").get()) {
    initializeDeletionRegistry(accounts, path, registryPath);
  }
  assertSeparateFiles(path, registryPath);
  return openDeletionRegistry(registryPath, false);
}

// The caller holds the primary write lock. A durable intent must exist before committing a delete.
export function recordAccountDeletion(accounts: DatabaseSync, registry: DatabaseSync, id: string, reason: DeletionReason) {
  const binding = accountDeletionBinding(accounts);
  const sequence = accountTransaction(registry, () => {
    const head = deletionHead(registry);
    if (head.id !== binding.id || head.sequence < binding.sequence) throw new Error("Deletion registry binding mismatch.");
    const existing = registry.prepare("SELECT sequence FROM account_deletion_events WHERE account_id = ?").get(id)?.sequence;
    if (typeof existing === "number") return existing;
    const next = head.sequence + 1;
    registry.prepare("INSERT INTO account_deletion_events VALUES (?, ?, ?, ?)").run(next, id, Date.now(), reason);
    registry.prepare("UPDATE account_deletion_head SET sequence = ? WHERE id = 1").run(next);
    return next;
  });
  accounts.prepare("UPDATE account_deletion_binding SET required_sequence = MAX(required_sequence, ?) WHERE id = 1").run(sequence);
}

export function checkDeletionCoverage(db: DatabaseSync) {
  const head = deletionHead(db);
  const events = db.prepare("SELECT count(*) AS total, min(sequence) AS first, max(sequence) AS last FROM account_deletion_events").get();
  if (events?.total !== head.sequence - head.floor ||
    (events.total !== 0 && (events.first !== head.floor + 1 || events.last !== head.sequence)) ||
    db.prepare("PRAGMA integrity_check").get()?.integrity_check !== "ok") {
    throw new Error("Deletion registry has gaps or failed its integrity check.");
  }
  return head;
}

export function deletionRegistryStatus(path: string) {
  using registry = openDeletionRegistry(path);
  registry.exec("BEGIN");
  return checkDeletionCoverage(registry);
}

export function pruneDeletionRegistry(path: string, now = Date.now()) {
  using registry = openDeletionRegistry(path, false);
  return accountTransaction(registry, () => {
    const head = checkDeletionCoverage(registry);
    // Advance only across a contiguous expired prefix, including after a clock correction.
    const firstRetained = registry.prepare("SELECT min(sequence) AS seq FROM account_deletion_events WHERE recorded_at > ?")
      .get(now - RETENTION_MS)?.seq;
    const floor = typeof firstRetained === "number" ? firstRetained - 1 : head.sequence;
    registry.prepare("DELETE FROM account_deletion_events WHERE sequence <= ?").run(floor);
    registry.prepare("UPDATE account_deletion_head SET floor = ? WHERE id = 1").run(floor);
    return floor;
  });
}
