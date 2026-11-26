import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { hashPassword, newToken, tokenHash } from "../../src/features/account/server/credentials.ts";
import { accountTransaction, openAccountDatabase } from "../../src/features/account/server/database.ts";
import { positiveInteger, readServerManifest } from "./target.mjs";

const { values } = parseArgs({ options: {
  server: { type: "string" }, count: { type: "string", default: "200" }, output: { type: "string" },
} });
if (!values.server || !values.output) throw new Error("Use --server <test manifest> --output <new fixture file> [--count 200].");
const server = await readServerManifest(values.server);
const count = positiveInteger(values.count, "fixture count", 1000);
const password = `Sophia performance test only ${randomUUID()}`;
const passwordHash = await hashPassword(password);
const run = randomUUID().slice(0, 8);
const now = Date.now();
const cookieName = server.origin.startsWith("https:") ? "__Host-sophia-session" : "sophia-session";
const fixtures = [];
const db = openAccountDatabase(server.path, true);
try {
  accountTransaction(db, () => {
    const insertUser = db.prepare(`INSERT INTO account_users
      (id, email, display_name, password_hash, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const insertSession = db.prepare(`INSERT INTO account_sessions
      (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`);
    for (let index = 0; index < count; index++) {
      const accountId = randomUUID();
      const email = `sophia-load-${run}-${index}@mail.ru`;
      const displayName = `Тест Sophia ${run}-${index}`;
      const token = newToken();
      insertUser.run(accountId, email, displayName, passwordHash, now, now, now);
      insertSession.run(tokenHash(token), accountId, now, now + 12 * 60 * 60 * 1000);
      fixtures.push({ accountId, email, displayName, password, cookie: `${cookieName}=${token}` });
    }
  });
} finally {
  db.close();
}
await writeFile(values.output, `${JSON.stringify(fixtures)}\n`, { mode: 0o600, flag: "wx" });
console.log(JSON.stringify({ event: "load-fixtures-seeded", count, output: values.output }));
