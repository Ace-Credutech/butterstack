-- Migration 074 — project_members.invited_by (Phase D)
-- Mirror of 074-project-members-invited-by.ts. Both forms must stay in lock-step.
-- Tracks which actor invited the member into the project (nullable — older rows have none).

-- ===== UP =====

ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS invited_by UUID NULL REFERENCES users(id);

-- ===== DOWN =====
-- ALTER TABLE project_members DROP COLUMN IF EXISTS invited_by;
