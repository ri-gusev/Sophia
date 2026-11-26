export const ACCOUNT_PROGRESS_SCHEMA = `
  CREATE TABLE account_lesson_progress (
    user_id TEXT NOT NULL REFERENCES account_users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    legacy_completed INTEGER NOT NULL DEFAULT 0 CHECK (legacy_completed IN (0, 1)),
    resume_scene_id TEXT,
    PRIMARY KEY (user_id, lesson_id)
  ) STRICT, WITHOUT ROWID;

  CREATE TABLE account_slide_progress (
    user_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    scene_id TEXT NOT NULL,
    PRIMARY KEY (user_id, lesson_id, scene_id),
    FOREIGN KEY (user_id, lesson_id) REFERENCES account_lesson_progress(user_id, lesson_id) ON DELETE CASCADE
  ) STRICT, WITHOUT ROWID;

  CREATE TABLE account_last_opened_lesson (
    user_id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL,
    FOREIGN KEY (user_id, lesson_id) REFERENCES account_lesson_progress(user_id, lesson_id) ON DELETE CASCADE
  ) STRICT, WITHOUT ROWID;
`;

export const ACCOUNT_PROGRESS_HISTORY_SCHEMA = `
  ALTER TABLE account_lesson_progress ADD COLUMN completed_at INTEGER CHECK (completed_at > 0);
  ALTER TABLE account_lesson_progress ADD COLUMN activity_order INTEGER NOT NULL DEFAULT 0 CHECK (activity_order >= 0);
`;
