-- Migration 073 — project_role_permissions (D-5)
-- Mirror of 073-project-role-permissions.ts. Both forms must stay in lock-step.

-- ===== UP =====

CREATE TABLE IF NOT EXISTS project_role_permissions (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_id        UUID         NOT NULL REFERENCES project_roles(id) ON DELETE CASCADE,
  permission_key VARCHAR(160) NOT NULL,
  feature_id     UUID         NULL,
  allow          BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by     UUID         NULL REFERENCES users(id),
  updated_by     UUID         NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS project_role_permissions_role_id_idx
  ON project_role_permissions (role_id);

CREATE INDEX IF NOT EXISTS project_role_permissions_project_id_idx
  ON project_role_permissions (project_id);

CREATE UNIQUE INDEX IF NOT EXISTS project_role_permissions_role_perm_feature_uniq
  ON project_role_permissions (role_id, permission_key, feature_id) WHERE feature_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_role_permissions_role_perm_nullfeature_uniq
  ON project_role_permissions (role_id, permission_key) WHERE feature_id IS NULL;

-- ===== DOWN =====
-- DROP TABLE IF EXISTS project_role_permissions;
