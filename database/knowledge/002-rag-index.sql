CREATE TABLE IF NOT EXISTS rag_documents (
  document_id TEXT NOT NULL REFERENCES documents(id),
  philosopher_id TEXT NOT NULL REFERENCES philosophers(id),
  revision INTEGER NOT NULL,
  source_hash TEXT NOT NULL,
  config_hash TEXT NOT NULL,
  chunk_count INTEGER NOT NULL CHECK(chunk_count > 0),
  indexed_at TEXT NOT NULL,
  PRIMARY KEY(document_id, philosopher_id)
) STRICT;
CREATE TABLE IF NOT EXISTS rag_chunks (
  chunk_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  philosopher_id TEXT NOT NULL REFERENCES philosophers(id),
  revision INTEGER NOT NULL,
  ordinal INTEGER NOT NULL,
  source_id TEXT NOT NULL,
  work TEXT NOT NULL,
  stephanus TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  content TEXT NOT NULL,
  heading TEXT NOT NULL,
  embedding TEXT NOT NULL CHECK(json_valid(embedding)),
  related_ids TEXT NOT NULL,
  translation TEXT NOT NULL,
  rights TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding_model_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(document_id, philosopher_id, ordinal)
) STRICT;
CREATE INDEX IF NOT EXISTS rag_by_philosopher ON rag_chunks(philosopher_id);
CREATE VIRTUAL TABLE IF NOT EXISTS rag_fts USING fts5(chunk_id UNINDEXED, philosopher_id UNINDEXED, content, tokenize='unicode61');
PRAGMA user_version = 2;
