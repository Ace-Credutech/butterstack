-- Migration 069 — projects.status column (D-7 from boss's plan)
-- Adds project lifecycle status: draft (default) → active (after Submit) → archived.
-- Mirror of 069-projects-add-status.ts. Keep both in lock-step.

-- ===== UP =====

ALTER TABLE projects
  ADD COLUMN status VARCHAR NOT NULL DEFAULT 'draft';

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check CHECK (status IN ('draft', 'active', 'archived'));

CREATE INDEX projects_status_idx ON projects (status);

-- ===== DOWN =====
-- DROP INDEX IF EXISTS projects_status_idx;
-- ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
-- ALTER TABLE projects DROP COLUMN IF EXISTS status;
