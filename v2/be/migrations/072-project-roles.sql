-- Migration 072 — project_roles
-- Mirror of 072-project-roles.ts (Sequelize). Use this file to apply directly
-- in TablePlus / psql when bypassing the migrator. Both forms must stay in
-- lock-step — if you edit one, edit the other.

-- ===== UP =====

CREATE TABLE IF NOT EXISTS project_roles (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL,
  description TEXT         NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ  NULL,
  created_by  UUID         NULL REFERENCES users(id),
  updated_by  UUID         NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS project_roles_project_id_idx
  ON project_roles (project_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_roles_project_name_uniq
  ON project_roles (project_id, lower(name)) WHERE deleted_at IS NULL;

-- ===== DOWN =====
-- DROP TABLE IF EXISTS project_roles;
