import { accountTransaction, openAccountDatabase } from "./database.ts";
import { accountDeletionBinding, assertSeparateFiles, checkDeletionCoverage, openDeletionRegistry } from "./deletion-registry.ts";

export function prepareAccountRestore(snapshotPath: string, registryPath: string, retainedIds: readonly string[], expectedSequence: number) {
  if (!Number.isSafeInteger(expectedSequence) || expectedSequence < 0) throw new Error("Invalid authoritative deletion sequence.");
  assertSeparateFiles(snapshotPath, registryPath);
  using registry = openDeletionRegistry(registryPath);
  registry.exec("BEGIN");
  const head = checkDeletionCoverage(registry);
  if (head.sequence !== expectedSequence) throw new Error("Deletion registry does not match the authoritative sequence.");

  using snapshot = openAccountDatabase(snapshotPath);
  const binding = accountDeletionBinding(snapshot);
  if (binding.id !== head.id || binding.sequence < head.floor || binding.sequence > head.sequence) {
    throw new Error("Snapshot is outside the deletion registry coverage.");
  }
  const retained = accountTransaction(snapshot, () => {
    snapshot.exec("CREATE TEMP TABLE retained_accounts (id TEXT PRIMARY KEY) WITHOUT ROWID;");
    const include = snapshot.prepare("INSERT INTO retained_accounts VALUES (?)");
    for (const id of retainedIds) {
      if (!id || /[\s\x00]/u.test(id)) throw new Error("Invalid ID in the verified account roster.");
      include.run(id);
    }
    const exclude = snapshot.prepare("DELETE FROM retained_accounts WHERE id = ?");
    for (const event of registry.prepare("SELECT account_id FROM account_deletion_events").iterate()) {
      if (typeof event.account_id !== "string") throw new Error("Invalid deletion registry entry.");
      exclude.run(event.account_id);
    }
    snapshot.exec(`DELETE FROM account_sessions;
      DELETE FROM account_challenges;
      DELETE FROM account_registrations WHERE user_id IS NULL;
      DELETE FROM account_entitlements;
      DELETE FROM account_rate_limits;
      DELETE FROM account_cleanup;
      DELETE FROM account_users WHERE NOT EXISTS (
        SELECT 1 FROM temp.retained_accounts AS r WHERE r.id = account_users.id
      );
      UPDATE account_users SET password_hash = '!restore-reset-required';`);
    snapshot.prepare("UPDATE account_deletion_binding SET required_sequence = ? WHERE id = 1").run(head.sequence);
    if (snapshot.prepare("PRAGMA foreign_key_check").get() ||
      snapshot.prepare("PRAGMA integrity_check").get()?.integrity_check !== "ok") {
      throw new Error("Restored account snapshot failed its integrity check.");
    }
    return snapshot.prepare("SELECT count(*) AS total FROM account_users").get()?.total;
  });
  if (snapshot.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get()?.busy !== 0) throw new Error("Restored snapshot WAL is busy.");
  return retained;
}
