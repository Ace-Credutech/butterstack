-- Migration 077 — messages (Phase E1)
-- Mirror of 077-messages.ts. Both forms must stay in lock-step.
-- Append-only message log inside a session. `project_id` is denormalized so
-- per-project queries don't need to join sessions on every read.

-- ===== UP =====

CREATE TABLE IF NOT EXISTS messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id       UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  participant_id   UUID        NULL REFERENCES session_participants(id),
  role             VARCHAR(20) NOT NULL,
  channel          VARCHAR(40) NULL,
  content          TEXT        NOT NULL,
  reply_to         UUID        NULL,
  attachments_json JSONB       NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE messages ADD CONSTRAINT messages_role_check CHECK (role IN ('user', 'ai', 'system'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD CONSTRAINT messages_reply_to_fk
    FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS messages_session_created_idx ON messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS messages_project_id_idx      ON messages (project_id);

-- ===== DOWN =====
-- DROP TABLE IF EXISTS messages;
