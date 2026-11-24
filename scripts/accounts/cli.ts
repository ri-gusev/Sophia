import { normalizeEmail } from "../../src/features/account/account-contract.ts";
import { accountSettings } from "../../src/features/account/server/config.ts";
import { accountTransaction, openAccountDatabase } from "../../src/features/account/server/database.ts";

function main() {
  const [command, email, ...extra] = process.argv.slice(2);
  const path = accountSettings().path;
  if (command === "migrate" && email === undefined) {
    const db = openAccountDatabase(path, true);
    const version = db.prepare("PRAGMA user_version").get()?.user_version;
    db.close();
    console.log(`Accounts database ready (schema ${version}).`);
    return;
  }
  if ((command !== "grant-ai-chat" && command !== "revoke-ai-chat") || extra.length > 0) {
    throw new Error("Usage: node scripts/accounts/cli.ts migrate | grant-ai-chat <email> | revoke-ai-chat <email>");
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
  console.error(error instanceof Error ? error.message : "Accounts command failed.");
  process.exitCode = 1;
}
