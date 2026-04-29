-- ===== UP =====

CREATE TABLE project_initial_context (
  project_id            UUID    PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  status                VARCHAR NOT NULL DEFAULT 'pending',
  json_payload          JSONB,
  markdown_text         TEXT,
  prompt_run_id         UUID,
  generated_at          TIMESTAMPTZ,
  generated_by_event_id UUID,
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE project_initial_context
  ADD CONSTRAINT project_initial_context_status_check
  CHECK (status IN ('pending', 'building', 'ready', 'failed'));

-- Seed the prompt + active version
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
  RETURNING id
)
UPDATE prompts SET current_version_id = (SELECT id FROM new_version)
WHERE id = (SELECT id FROM prompt_id);

-- ===== DOWN =====
-- UPDATE prompts SET current_version_id = NULL WHERE slug = 'project.initial-context';
-- DELETE FROM prompt_versions WHERE prompt_id IN (SELECT id FROM prompts WHERE slug = 'project.initial-context');
-- DELETE FROM prompts WHERE slug = 'project.initial-context';
-- DROP TABLE project_initial_context;
