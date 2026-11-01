import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

type Entity = { id: string; name: string };
type ImportInput = {
  filePath: string;
  documentId: string;
  title: string;
  philosophers: readonly Entity[];
  topics?: readonly Entity[];
};

const defaultStorage = fileURLToPath(new URL("../../storage/knowledge/", import.meta.url));
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function validateId(id: string) {
  if (id.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error("Invalid identifier: use lowercase letters, numbers and hyphens (max 80).");
  }
}

function validateName(name: string) {
  if (!name.trim() || name.length > 300) throw new Error("A non-empty name/title of at most 300 characters is required.");
}

/** Offline maintenance only. Corpus bytes never enter the public application. */
export class KnowledgeStore {
  readonly databasePath: string;
  private readonly root: string;
  private readonly db: DatabaseSync;
  private closed = false;

  constructor(storageDirectory = defaultStorage) {
    this.root = resolve(storageDirectory);
    mkdirSync(this.root, { recursive: true });
    this.databasePath = join(this.root, "sophia-knowledge.sqlite");
    this.db = new DatabaseSync(this.databasePath);
    try {
      this.db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
      this.db.exec("BEGIN IMMEDIATE");
      const version = this.db.prepare("PRAGMA user_version").get()!.user_version;
      if (version === 0) {
        this.db.exec(readFileSync(new URL("../../database/knowledge/001-initial.sql", import.meta.url), "utf8"));
      } else if (version !== 1) {
        throw new Error("Unsupported knowledge database schema version.");
      }
      this.db.exec("COMMIT");
    } catch (error) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      this.db.close();
      throw error;
    }
  }

  importFile(input: ImportInput) {
    validateId(input.documentId);
    validateName(input.title);
    if (!input.philosophers.length) throw new Error("At least one philosopher is required.");
    for (const entity of [...input.philosophers, ...(input.topics ?? [])]) {
      validateId(entity.id);
      validateName(entity.name);
    }
    if (![".md", ".markdown"].includes(extname(input.filePath).toLowerCase())) {
      throw new Error("A Markdown source file is required.");
    }

    // Opaque binary transfer: do not decode, parse, extract or log corpus text.
    const bytes = readFileSync(input.filePath);
    const sha256 = digest(bytes);
    const originalFilename = basename(input.filePath);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT INTO documents(id, title) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title")
        .run(input.documentId, input.title);
      for (const philosopher of input.philosophers) {
        this.db.prepare("INSERT INTO philosophers(id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name")
          .run(philosopher.id, philosopher.name);
        this.db.prepare("INSERT OR IGNORE INTO document_philosophers(document_id, philosopher_id) VALUES (?, ?)")
          .run(input.documentId, philosopher.id);
      }
      for (const topic of input.topics ?? []) {
        this.db.prepare("INSERT INTO topics(id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name")
          .run(topic.id, topic.name);
        this.db.prepare("INSERT OR IGNORE INTO document_topics(document_id, topic_id) VALUES (?, ?)")
          .run(input.documentId, topic.id);
      }
      const existing = this.db.prepare("SELECT revision, archive_path, content FROM document_revisions WHERE document_id = ? AND sha256 = ?")
        .get(input.documentId, sha256);
      const revision = existing
        ? Number(existing.revision)
        : Number(this.db.prepare("SELECT COALESCE(MAX(revision), 0) + 1 AS next FROM document_revisions WHERE document_id = ?")
          .get(input.documentId)!.next);
      const relativeArchivePath = existing
        ? String(existing.archive_path)
        : ["sources", input.documentId, sha256, originalFilename].join("/");
      const archivePath = this.archiveAbsolutePath(relativeArchivePath);
      if (existing && digest(existing.content as Uint8Array) !== sha256) {
        throw new Error("Stored document checksum mismatch; import stopped.");
      }
      mkdirSync(resolve(archivePath, ".."), { recursive: true });
      if (existsSync(archivePath)) {
        if (digest(readFileSync(archivePath)) !== sha256) throw new Error("Archived source checksum mismatch; import stopped.");
      } else {
        writeFileSync(archivePath, bytes, { flag: "wx" });
      }
      if (!existing) {
        this.db.prepare(`INSERT INTO document_revisions
          (document_id, revision, original_filename, sha256, byte_length, archive_path, content)
          VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(input.documentId, revision, originalFilename, sha256, bytes.byteLength, relativeArchivePath, bytes);
      }
      this.db.exec("COMMIT");
      return { documentId: input.documentId, revision, sha256, byteLength: bytes.byteLength, archivePath, created: !existing };
    } catch (error) {
      this.db.exec("ROLLBACK");
      // A snapshot written before an interrupted transaction may remain; it is
      // immutable and is reused safely on retry. Existing data is never deleted.
      throw error;
    }
  }

  private archiveAbsolutePath(relativePath: string) {
    const absolutePath = resolve(this.root, relativePath);
    if (!absolutePath.startsWith(this.root + sep)) throw new Error("Invalid archive path.");
    return absolutePath;
  }

  status() {
    const count = (query: string) => Number(this.db.prepare(query).get()!.count);
    return {
      databasePath: this.databasePath,
      schemaVersion: Number(this.db.prepare("PRAGMA user_version").get()!.user_version),
      counts: {
        philosophers: count("SELECT COUNT(*) AS count FROM philosophers"),
        topics: count("SELECT COUNT(*) AS count FROM topics"),
        documents: count("SELECT COUNT(*) AS count FROM documents"),
        revisions: count("SELECT COUNT(*) AS count FROM document_revisions"),
        philosopherLinks: count("SELECT COUNT(*) AS count FROM document_philosophers"),
        topicLinks: count("SELECT COUNT(*) AS count FROM document_topics"),
      },
      philosophers: this.db.prepare("SELECT id, name FROM philosophers ORDER BY id").all(),
      topics: this.db.prepare("SELECT id, name FROM topics ORDER BY id").all(),
      documents: this.db.prepare(`SELECT d.id, d.title, r.revision, r.original_filename,
          r.sha256, r.byte_length, r.imported_at
        FROM documents d JOIN document_revisions r ON r.document_id = d.id
        WHERE r.revision = (SELECT MAX(latest.revision) FROM document_revisions latest WHERE latest.document_id = d.id)
        ORDER BY d.id`).all(),
    };
  }

  verifyDocument(documentId: string) {
    validateId(documentId);
    const row = this.db.prepare("SELECT revision, sha256, byte_length, content, archive_path FROM document_revisions WHERE document_id = ? ORDER BY revision DESC LIMIT 1")
      .get(documentId);
    if (!row) throw new Error("Document not found.");
    const content = row.content as Uint8Array;
    const archivePath = this.archiveAbsolutePath(String(row.archive_path));
    const archive = existsSync(archivePath) ? readFileSync(archivePath) : undefined;
    return {
      documentId,
      revision: Number(row.revision),
      databaseMatches: content.byteLength === row.byte_length && digest(content) === row.sha256,
      archiveMatches: !!archive && archive.byteLength === row.byte_length && digest(archive) === row.sha256,
    };
  }

  close() {
    if (!this.closed) {
      this.db.close();
      this.closed = true;
    }
  }
}
