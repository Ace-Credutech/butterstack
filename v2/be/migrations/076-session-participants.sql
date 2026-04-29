-- Migration 076 — session_participants (Phase E1)
-- Mirror of 076-session-participants.ts. Both forms must stay in lock-step.
-- One row per actor in a session. `user_id` + `member_id` are nullable so AI
-- and system participants can live here too without a real user/member row.

-- ===== UP =====

CREATE TABLE IF NOT EXISTS session_participants (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID         NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id      UUID         NULL REFERENCES users(id),
  member_id    UUID         NULL REFERENCES project_members(id),
  kind         VARCHAR(20)  NOT NULL,
  display_name VARCHAR(240) NOT NULL,
  joined_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  left_at      TIMESTAMPTZ  NULL
);

DO $$ BEGIN
  ALTER TABLE session_participants ADD CONSTRAINT session_participants_kind_check
    CHECK (kind IN ('human', 'ai', 'system'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS session_participants_session_id_idx ON session_participants (session_id);

-- ===== DOWN =====
-- DROP TABLE IF EXISTS session_participants;
