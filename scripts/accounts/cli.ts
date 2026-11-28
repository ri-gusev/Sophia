import { normalizeEmail } from "../../src/features/account/account-contract.ts";
import { accountSettings } from "../../src/features/account/server/config.ts";
import { accountTransaction, openAccountDatabase } from "../../src/features/account/server/database.ts";
import { cleanupAccounts } from "../../src/features/account/server/cleanup.ts";
import {
  assertSeparateFiles, deletionRegistryPath, deletionRegistryStatus, initializeDeletionRegistry, pruneDeletionRegistry,
} from "../../src/features/account/server/deletion-registry.ts";
import { prepareAccountRestore } from "../../src/features/account/server/restore.ts";
import { eraseAccountByOperator } from "../../src/features/account/server/store.ts";

function main() {
  const [command, email, ...extra] = process.argv.slice(2);
  const path = accountSettings().path;
  if (command === "init-deletions" && email === undefined) {
    using db = openAccountDatabase(path);
    console.log(JSON.stringify(initializeDeletionRegistry(db, path, deletionRegistryPath())));
    return;
  }
  if (command === "deletions-status" && email === undefined) {
    console.log(JSON.stringify(deletionRegistryStatus(deletionRegistryPath())));
    return;
  }
  if (command === "prune-deletions" && email === undefined) {
    console.log(`Deletion registry pruned through sequence ${pruneDeletionRegistry(deletionRegistryPath())}.`);
    return;
  }
  if (command === "erase-account" && email === undefined) {
    const id = readFileSync(0, "utf8").trim();
    if (!id || /[\s\x00]/u.test(id)) throw new Error("Provide the verified internal account ID on stdin.");
    console.log(eraseAccountByOperator(id) ? "Account removed." : "Account already absent.");
    return;
  }
  if (command === "prepare-restore") {
    const [roster, sequence] = extra;
    if (extra.length !== 2 || !email || !isAbsolute(email) || !roster || !isAbsolute(roster) ||
      !sequence || !/^\d+$/.test(sequence)) throw new Error("Usage: prepare-restore <absolute snapshot> <absolute verified roster> <authoritative sequence>");
    assertSeparateFiles(email, path);
    const ids = readFileSync(roster, "utf8").split(/\r?\n/);
    if (ids.at(-1) === "") ids.pop();
    console.log(`Quarantine snapshot ready. Retained accounts: ${prepareAccountRestore(email, deletionRegistryPath(), ids, Number(sequence))}.`);
    return;
  }
  if (command === "migrate" && email === undefined) {
    const db = openAccountDatabase(path, true);
    const version = db.prepare("PRAGMA user_version").get()?.user_version;
    db.close();
    console.log(`Accounts database ready (schema ${version}).`);
    return;
  }
  if (command === "cleanup" && email === undefined) {
    const db = openAccountDatabase(path);
    try {
      cleanupAccounts(db, { force: true });
    } finally {
      db.close();
    }
    console.log("Expired account data cleaned.");
    return;
  }
  if ((command !== "grant-ai-chat" && command !== "revoke-ai-chat") || extra.length > 0) {
    throw new Error("Usage: accounts CLI migrate | cleanup | init-deletions | deletions-status | prune-deletions | erase-account | prepare-restore | grant-ai-chat | revoke-ai-chat");
  }
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Provide a valid email address.");
  const db = openAccountDatabase(path);
  try {
    accountTransaction(db, () => {
      const user = db.prepare("SELECT id FROM account_users WHERE email = ? AND email_verified_at > 0").get(normalizedEmail);
      if (typeof user?.id !== "string") throw new Error("No verified account matches this address.");
      if (command === "grant-ai-chat") {
        db.prepare("INSERT INTO account_entitlements VALUES (?, 'ai_chat', ?) ON CONFLICT DO NOTHING").run(user.id, Date.now());
      } else {
        db.prepare("DELETE FROM account_entitlements WHERE user_id = ? AND capability = 'ai_chat'").run(user.id);
      }
    });
  } finally {
    db.close();
  }
  console.log(command === "grant-ai-chat" ? "AI chat access granted." : "AI chat access revoked.");
}

try {
  main();
} catch (error) {
  if (process.argv[2] === "erase-account") console.error("Account removal failed. Verify the registry and retry.");
  else console.error(error instanceof Error ? error.message : "Accounts command failed.");
  process.exitCode = 1;
}
import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
