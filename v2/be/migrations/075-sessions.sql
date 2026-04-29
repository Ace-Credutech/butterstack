-- Migration 075 — sessions (Phase E1)
-- Mirror of 075-sessions.ts. Both forms must stay in lock-step.
-- A session is a multi-participant conversation scoped to a project. Phase E1
-- holds humans only; later phases add AI participants and quiz mode.

-- ===== UP =====

CREATE TABLE IF NOT EXISTS sessions (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind       VARCHAR(40)  NOT NULL,
  title      VARCHAR(240) NULL,
  started_by UUID         NULL REFERENCES users(id),
  ended_at   TIMESTAMPTZ  NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE sessions ADD CONSTRAINT sessions_kind_check
    CHECK (kind IN ('clarification', 'quiz', 'review'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS sessions_project_id_idx   ON sessions (project_id);
CREATE INDEX IF NOT EXISTS sessions_project_kind_idx ON sessions (project_id, kind);

-- ===== DOWN =====
-- DROP TABLE IF EXISTS sessions;
