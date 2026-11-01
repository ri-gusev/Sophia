CREATE TABLE philosophers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
) STRICT;

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
) STRICT;

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'markdown' CHECK (format = 'markdown'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE document_revisions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  original_filename TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  archive_path TEXT NOT NULL,
  content BLOB NOT NULL CHECK (length(content) = byte_length),
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(document_id, revision),
  UNIQUE(document_id, sha256)
) STRICT;

CREATE TABLE document_philosophers (
  document_id TEXT NOT NULL REFERENCES documents(id),
  philosopher_id TEXT NOT NULL REFERENCES philosophers(id),
  PRIMARY KEY (document_id, philosopher_id)
) STRICT;

CREATE TABLE document_topics (
  document_id TEXT NOT NULL REFERENCES documents(id),
  topic_id TEXT NOT NULL REFERENCES topics(id),
  PRIMARY KEY (document_id, topic_id)
) STRICT;

CREATE INDEX document_philosophers_by_philosopher ON document_philosophers(philosopher_id);
CREATE INDEX document_topics_by_topic ON document_topics(topic_id);
PRAGMA user_version = 1;
