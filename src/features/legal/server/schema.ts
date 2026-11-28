export const ACCOUNT_LEGAL_SCHEMA = `
  CREATE TABLE legal_revisions (
    kind TEXT NOT NULL CHECK (kind IN ('privacy', 'terms', 'consent', 'age')),
    version TEXT NOT NULL,
    content TEXT NOT NULL,
    sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
    PRIMARY KEY (kind, version)
  ) STRICT, WITHOUT ROWID;
  CREATE TRIGGER legal_revisions_no_update BEFORE UPDATE ON legal_revisions
    BEGIN SELECT RAISE(ABORT, 'Legal revisions are immutable'); END;
  CREATE TRIGGER legal_revisions_no_delete BEFORE DELETE ON legal_revisions
    BEGIN SELECT RAISE(ABORT, 'Legal revisions are immutable'); END;
  CREATE TRIGGER legal_revisions_no_replace BEFORE INSERT ON legal_revisions
    WHEN EXISTS (SELECT 1 FROM legal_revisions WHERE kind = NEW.kind AND version = NEW.version)
    BEGIN SELECT RAISE(ABORT, 'Legal revisions are immutable'); END;

  CREATE TABLE account_registrations (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT UNIQUE REFERENCES account_users(id) ON DELETE CASCADE,
    privacy_kind TEXT GENERATED ALWAYS AS ('privacy') VIRTUAL,
    privacy_version TEXT NOT NULL,
    expires_at INTEGER,
    verified_at INTEGER,
    CHECK ((user_id IS NULL AND expires_at IS NOT NULL AND verified_at IS NULL) OR
      (user_id IS NOT NULL AND expires_at IS NULL AND verified_at IS NOT NULL)),
    FOREIGN KEY (privacy_kind, privacy_version) REFERENCES legal_revisions(kind, version)
  ) STRICT;
  CREATE INDEX account_registrations_expiry ON account_registrations(expires_at) WHERE expires_at IS NOT NULL;

  CREATE TABLE account_legal_confirmations (
    registration_id TEXT NOT NULL REFERENCES account_registrations(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('age', 'terms', 'consent')),
    version TEXT NOT NULL,
    confirmed_at INTEGER NOT NULL,
    FOREIGN KEY (kind, version) REFERENCES legal_revisions(kind, version),
    PRIMARY KEY (registration_id, kind)
  ) STRICT, WITHOUT ROWID;

  -- Old verification links contain no legal confirmations. Reset links are preserved.
  DELETE FROM account_challenges WHERE kind = 'verify';
  ALTER TABLE account_challenges ADD COLUMN registration_id TEXT REFERENCES account_registrations(id) ON DELETE CASCADE;
  CREATE INDEX account_challenges_registration ON account_challenges(registration_id);
  CREATE TRIGGER account_challenges_require_registration BEFORE INSERT ON account_challenges
    WHEN (NEW.kind = 'verify') != (NEW.registration_id IS NOT NULL)
    BEGIN SELECT RAISE(ABORT, 'Verification requires a registration request'); END;

  CREATE TABLE account_cleanup (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    completed_at INTEGER NOT NULL
  ) STRICT;
`;

export const ACCOUNT_MAILING_CONSENT_SCHEMA = `
  CREATE TABLE account_mailing_consents (
    registration_id TEXT PRIMARY KEY NOT NULL REFERENCES account_registrations(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    document TEXT NOT NULL,
    confirmed_at INTEGER NOT NULL,
    withdrawn_at INTEGER CHECK (withdrawn_at >= confirmed_at)
  ) STRICT, WITHOUT ROWID;
`;

export const ACCOUNT_PROFILE_MAILING_CONSENT_SCHEMA = `
  CREATE TABLE account_profile_mailing_consents (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES account_users(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    document TEXT NOT NULL,
    confirmed_at INTEGER NOT NULL,
    withdrawn_at INTEGER CHECK (withdrawn_at >= confirmed_at)
  ) STRICT;
  CREATE INDEX account_profile_mailing_consents_user ON account_profile_mailing_consents(user_id);
  CREATE UNIQUE INDEX account_profile_mailing_consents_active
    ON account_profile_mailing_consents(user_id) WHERE withdrawn_at IS NULL;
`;

export const ACCOUNT_PROFILE_MAILING_REVISION_SCHEMA = `
  CREATE TABLE account_mailing_revisions (
    id INTEGER PRIMARY KEY,
    version TEXT NOT NULL,
    document TEXT NOT NULL,
    UNIQUE (version, document)
  ) STRICT;
  INSERT INTO account_mailing_revisions (version, document)
    SELECT DISTINCT version, document FROM account_profile_mailing_consents;
  ALTER TABLE account_profile_mailing_consents RENAME TO account_profile_mailing_consents_old;
  CREATE TABLE account_profile_mailing_consents (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES account_users(id) ON DELETE CASCADE,
    revision_id INTEGER NOT NULL REFERENCES account_mailing_revisions(id),
    confirmed_at INTEGER NOT NULL,
    withdrawn_at INTEGER CHECK (withdrawn_at >= confirmed_at)
  ) STRICT;
  INSERT INTO account_profile_mailing_consents
    SELECT c.id, c.user_id, r.id, c.confirmed_at, c.withdrawn_at
    FROM account_profile_mailing_consents_old AS c
    JOIN account_mailing_revisions AS r ON r.version = c.version AND r.document = c.document;
  DROP TABLE account_profile_mailing_consents_old;
  CREATE INDEX account_profile_mailing_consents_user ON account_profile_mailing_consents(user_id, confirmed_at);
  CREATE UNIQUE INDEX account_profile_mailing_consents_active
    ON account_profile_mailing_consents(user_id) WHERE withdrawn_at IS NULL;
  CREATE TRIGGER account_mailing_revisions_no_update BEFORE UPDATE ON account_mailing_revisions
    BEGIN SELECT RAISE(ABORT, 'Mailing revisions are immutable'); END;
  CREATE TRIGGER account_mailing_revisions_no_delete BEFORE DELETE ON account_mailing_revisions
    BEGIN SELECT RAISE(ABORT, 'Mailing revisions are immutable'); END;
  CREATE TRIGGER account_mailing_revisions_no_replace BEFORE INSERT ON account_mailing_revisions
    WHEN EXISTS (SELECT 1 FROM account_mailing_revisions WHERE id = NEW.id)
    BEGIN SELECT RAISE(ABORT, 'Mailing revisions are immutable'); END;
`;
