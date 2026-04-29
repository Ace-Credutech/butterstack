-- =============================================================================
-- Combined migration bundle — 068 → 073
-- Run-once helper for TablePlus / psql when you want to apply every Phase A → C
-- change in one go. Wrapped in a single transaction so partial failure rolls back.
--
-- Idempotent: each statement uses IF NOT EXISTS / DO blocks so re-running is safe.
-- Mirror of the individual NNN-*.sql / .ts files. If you edit one, edit the
-- matching NNN file too.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 068 — project_init_steps
-- Resumable stepper marker (Phase A). One row per (project, step number 1–6).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_init_steps (
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step       INTEGER     NOT NULL,
  status     VARCHAR     NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID        NULL REFERENCES users(id),
  PRIMARY KEY (project_id, step)
);

DO $$ BEGIN
  ALTER TABLE project_init_steps
    ADD CONSTRAINT project_init_steps_step_check CHECK (step BETWEEN 1 AND 6);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE project_init_steps
    ADD CONSTRAINT project_init_steps_status_check
    CHECK (status IN ('in-progress', 'done', 'stale'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 069 — projects.status (D-7 — draft → active → archived lifecycle)
-- -----------------------------------------------------------------------------

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'draft';

DO $$ BEGIN
  ALTER TABLE projects
    ADD CONSTRAINT projects_status_check
    CHECK (status IN ('draft', 'active', 'archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status);

-- -----------------------------------------------------------------------------
-- 070 — documents.storage_key nullable (D-1 — paste-as-text support)
-- Paste rows live with kind='paste', storage_key=NULL, parsed_text=raw content.
-- -----------------------------------------------------------------------------

ALTER TABLE documents
  ALTER COLUMN storage_key DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- 071 — project_initial_context (Phase B.5)
-- AI-generated initial context summary, built after Step 2 closes.
-- Includes prompt + prompt_version seeding so run_prompt() works out of the box.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_initial_context (
  project_id            UUID        PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  status                VARCHAR     NOT NULL DEFAULT 'pending',
  json_payload          JSONB,
  markdown_text         TEXT,
  prompt_run_id         UUID,
  generated_at          TIMESTAMPTZ,
  generated_by_event_id UUID,
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE project_initial_context
    ADD CONSTRAINT project_initial_context_status_check
    CHECK (status IN ('pending', 'building', 'ready', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed the prompt + active version (no-op if already present).
WITH new_prompt AS (
  INSERT INTO prompts (id, slug, name, description, category, status, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'project.initial-context',
    'Project — Initial Context Builder',
    'Builds the initial context summary for a project from its brief + uploaded/pasted documents (Phase B.5).',
    'project',
    'active',
    now(),
    now()
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
), prompt_id AS (
  SELECT id FROM new_prompt
  UNION ALL
  SELECT id FROM prompts WHERE slug = 'project.initial-context' AND NOT EXISTS (SELECT 1 FROM new_prompt)
), version_exists AS (
  SELECT 1 FROM prompt_versions WHERE prompt_id = (SELECT id FROM prompt_id) AND version = 1
), new_version AS (
  INSERT INTO prompt_versions (
    id, prompt_id, version, status, system_text, user_template,
    model, temperature, max_tokens, response_format,
    response_schema, variables_schema, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    (SELECT id FROM prompt_id),
    1,
    'active',
    'You are an analyst helping a software team capture the initial context of a new project.

You will be given the project name + brief, plus an array of source documents (file names, types, and parsed text). Your job is to:

1. Synthesize a clean, deduplicated context summary from the sources.
2. Group findings into logical sections.
3. Tag every fact with the source document(s) it came from so traceability is preserved.

Return ONLY valid JSON matching this exact shape — no prose, no code fences:

{
  "title": "string — short title for this context bundle",
  "summary": "string — 2–4 paragraph overall summary in markdown",
  "sections": [
    {
      "heading": "string — section name (e.g. ''Goals'', ''Constraints'', ''Existing systems'')",
      "bullets": [
        {
          "text": "string — single fact / requirement / constraint",
          "source_document_ids": ["uuid", ...]
        }
      ]
    }
  ],
  "open_questions": [ "string", ... ],
  "glossary": [ { "term": "string", "definition": "string" } ]
}

Rules:
- Every bullet MUST cite at least one source_document_id from the input list.
- Do not invent facts. If something is unclear, add it to open_questions.
- Keep the JSON minimal — no commentary outside the structure.',
    'Project name: {{project_name}}
Project brief: {{project_brief}}

Source documents (id → filename → text):
{{sources_block}}

Produce the initial-context JSON now.',
    'gpt-4.1',
    0.4,
    4000,
    'json',
    '{"type":"object","required":["title","summary","sections"],"properties":{"title":{"type":"string"},"summary":{"type":"string"},"sections":{"type":"array","items":{"type":"object","required":["heading","bullets"],"properties":{"heading":{"type":"string"},"bullets":{"type":"array","items":{"type":"object","required":["text","source_document_ids"],"properties":{"text":{"type":"string"},"source_document_ids":{"type":"array","items":{"type":"string"}}}}}}}},"open_questions":{"type":"array","items":{"type":"string"}},"glossary":{"type":"array","items":{"type":"object","required":["term","definition"],"properties":{"term":{"type":"string"},"definition":{"type":"string"}}}}}}'::jsonb,
    '{"type":"object","required":["project_name","project_brief","sources_block"],"properties":{"project_name":{"type":"string"},"project_brief":{"type":"string"},"sources_block":{"type":"string"}}}'::jsonb,
    now(),
    now()
  WHERE NOT EXISTS (SELECT 1 FROM version_exists)
  RETURNING id
)
UPDATE prompts SET current_version_id = COALESCE(
  (SELECT id FROM new_version),
  (SELECT id FROM prompt_versions WHERE prompt_id = (SELECT id FROM prompt_id) AND version = 1 LIMIT 1)
)
WHERE id = (SELECT id FROM prompt_id);

-- -----------------------------------------------------------------------------
-- 072 — project_roles (Phase C — app personas: Admin/Teacher/Student/etc.)
-- Soft-deleted via deleted_at. Unique on (project_id, lower(name)) WHERE alive.
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- 073 — project_role_permissions (Phase C — D-5 RBAC matrix)
-- One row per (role × permission_key × feature_id?). feature_id is NULL until
-- Phase F lands modules/features. Two partial unique indexes cover both cases.
-- -----------------------------------------------------------------------------

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

-- =============================================================================
-- COMMIT — uncomment ROLLBACK below if you want to inspect first
-- =============================================================================

COMMIT;
-- ROLLBACK;

-- =============================================================================
-- DOWN (manual — run in reverse order if you need to undo everything)
-- =============================================================================
-- DROP TABLE IF EXISTS project_role_permissions;
-- DROP TABLE IF EXISTS project_roles;
-- UPDATE prompts SET current_version_id = NULL WHERE slug = 'project.initial-context';
-- DELETE FROM prompt_versions WHERE prompt_id IN (SELECT id FROM prompts WHERE slug = 'project.initial-context');
-- DELETE FROM prompts WHERE slug = 'project.initial-context';
-- DROP TABLE IF EXISTS project_initial_context;
-- ALTER TABLE documents ALTER COLUMN storage_key SET NOT NULL;  -- fails if any NULLs exist
-- DROP INDEX IF EXISTS projects_status_idx;
-- ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
-- ALTER TABLE projects DROP COLUMN IF EXISTS status;
-- DROP TABLE IF EXISTS project_init_steps;
