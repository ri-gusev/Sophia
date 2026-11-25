import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { confirmationKinds } from "../contract.ts";
import { tokenHash } from "../../account/server/credentials.ts";
import type { LegalRevision } from "./revisions.ts";

export const REGISTRATION_AGE = 24 * 60 * 60_000;

export function recordRegistration(db: DatabaseSync, revisions: readonly LegalRevision[], now: number): string {
  const privacy = revisions.find(revision => revision.kind === "privacy");
  if (!privacy) throw new Error("Missing privacy revision");
  const read = db.prepare("SELECT content, sha256 FROM legal_revisions WHERE kind = ? AND version = ?");
  const insert = db.prepare("INSERT INTO legal_revisions VALUES (?, ?, ?, ?)");
  for (const revision of revisions) {
    const content = JSON.stringify(revision);
    const hash = tokenHash(content);
    const previous = read.get(revision.kind, revision.version);
    if (!previous) insert.run(revision.kind, revision.version, content, hash);
    else if (previous.content !== content || previous.sha256 !== hash) throw new Error("Legal revision reused with changed content");
  }
  const id = randomUUID();
  db.prepare("INSERT INTO account_registrations (id, privacy_version, expires_at) VALUES (?, ?, ?)")
    .run(id, privacy.version, now + REGISTRATION_AGE);
  const confirm = db.prepare("INSERT INTO account_legal_confirmations VALUES (?, ?, ?, ?)");
  for (const kind of confirmationKinds) {
    const revision = revisions.find(revision => revision.kind === kind);
    if (!revision) throw new Error("Missing confirmation revision");
    confirm.run(id, kind, revision.version, now);
  }
  return id;
}

export function currentPendingRegistration(db: DatabaseSync, id: string, revisions: readonly LegalRevision[], now: number) {
  const registration = db.prepare(`SELECT expires_at AS expiresAt FROM account_registrations
    WHERE id = ? AND user_id IS NULL AND expires_at > ?`).get(id, now);
  if (typeof registration?.expiresAt !== "number") return null;
  const stored = db.prepare(`
    SELECT d.kind, d.version, d.sha256 FROM account_legal_confirmations AS c
    JOIN legal_revisions AS d USING (kind, version) WHERE c.registration_id = ?
    UNION ALL
    SELECT d.kind, d.version, d.sha256 FROM account_registrations AS r JOIN legal_revisions AS d
      ON d.kind = r.privacy_kind AND d.version = r.privacy_version WHERE r.id = ?
  `).all(id, id);
  if (!revisions.every(revision => stored.some(row =>
    row.kind === revision.kind && row.version === revision.version && row.sha256 === tokenHash(JSON.stringify(revision))))) return null;
  return { id, expiresAt: registration.expiresAt };
}
