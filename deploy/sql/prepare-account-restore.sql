-- Run only on an offline, migrated account database. In the same connection
-- the operator must populate TEMP retained_accounts(id) from the verified roster.
PRAGMA foreign_keys = ON;
PRAGMA secure_delete = ON;
BEGIN IMMEDIATE;
DELETE FROM account_sessions;
DELETE FROM account_challenges;
DELETE FROM account_registrations WHERE user_id IS NULL;
DELETE FROM account_entitlements;
DELETE FROM account_rate_limits;
DELETE FROM account_cleanup;
DELETE FROM account_users WHERE NOT EXISTS (
  SELECT 1 FROM temp.retained_accounts AS r WHERE r.id = account_users.id
);
-- Older password hashes can match passwords already changed after this snapshot.
-- This sentinel is rejected by the password verifier. Verified email reset is required.
UPDATE account_users SET password_hash = '!restore-reset-required';
COMMIT;
PRAGMA wal_checkpoint(TRUNCATE);
