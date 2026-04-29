-- Migration 068 — project_init_steps
-- Mirror of 068-project-init-steps.ts (Sequelize). Use this file to apply directly
-- in TablePlus / psql when you don't want to run the migrator. Both forms must stay
-- in lock-step — if you edit one, edit the other.

-- ===== UP =====

CREATE TABLE IF NOT EXISTS project_init_steps (
  project_id UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step       INTEGER NOT NULL,
  status     VARCHAR NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID    NULL REFERENCES users(id),
  PRIMARY KEY (project_id, step),
  CONSTRAINT project_init_steps_step_check   CHECK (step BETWEEN 1 AND 6),
  CONSTRAINT project_init_steps_status_check CHECK (status IN ('in-progress', 'done', 'stale'))
);

-- ===== DOWN =====
-- DROP TABLE IF EXISTS project_init_steps;
