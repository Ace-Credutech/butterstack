import { QueryInterface, DataTypes } from 'sequelize';

const STATUS_VALUES = ['pending', 'building', 'ready', 'failed'];
const to_sql_list = (xs: string[]): string => xs.map(x => `'${x}'`).join(', ');

const PROMPT_SLUG     = 'project.initial-context';
const PROMPT_NAME     = 'Project — Initial Context Builder';
const PROMPT_CATEGORY = 'project';

const SYSTEM_TEXT = `You are an analyst helping a software team capture the initial context of a new project.

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
      "heading": "string — section name (e.g. 'Goals', 'Constraints', 'Existing systems')",
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
- Keep the JSON minimal — no commentary outside the structure.`;

const USER_TEMPLATE = `Project name: {{project_name}}
Project brief: {{project_brief}}

Source documents (id → filename → text):
{{sources_block}}

Produce the initial-context JSON now.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  required: ['title', 'summary', 'sections'],
  properties: {
    title:   { type: 'string' },
    summary: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        required: ['heading', 'bullets'],
        properties: {
          heading: { type: 'string' },
          bullets: {
            type: 'array',
            items: {
              type: 'object',
              required: ['text', 'source_document_ids'],
              properties: {
                text: { type: 'string' },
                source_document_ids: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    open_questions: { type: 'array', items: { type: 'string' } },
    glossary: {
      type: 'array',
      items: {
        type: 'object',
        required: ['term', 'definition'],
        properties: { term: { type: 'string' }, definition: { type: 'string' } },
      },
    },
  },
};

const VARIABLES_SCHEMA = {
  type: 'object',
  required: ['project_name', 'project_brief', 'sources_block'],
  properties: {
    project_name:  { type: 'string' },
    project_brief: { type: 'string' },
    sources_block: { type: 'string' },
  },
};

export const up = async (qi: QueryInterface) => {
  await qi.createTable('project_initial_context', {
    project_id:            { type: DataTypes.UUID, primaryKey: true, references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE' },
    status:                { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    json_payload:          { type: DataTypes.JSONB, allowNull: true },
    markdown_text:         { type: DataTypes.TEXT,  allowNull: true },
    prompt_run_id:         { type: DataTypes.UUID,  allowNull: true },
    generated_at:          { type: DataTypes.DATE,  allowNull: true },
    generated_by_event_id: { type: DataTypes.UUID,  allowNull: true },
    error_message:         { type: DataTypes.TEXT,  allowNull: true },
    created_at:            { type: DataTypes.DATE,  allowNull: false },
    updated_at:            { type: DataTypes.DATE,  allowNull: false },
  });

  await qi.sequelize.query(
    `ALTER TABLE project_initial_context ADD CONSTRAINT project_initial_context_status_check CHECK (status IN (${to_sql_list(STATUS_VALUES)}));`,
  );

  // Seed the prompt + active version so run_prompt() works out of the box.
  // User can edit via admin UI later (creates a new version in the normal flow).
  const [prompt_rows] = await qi.sequelize.query<any>(
    `INSERT INTO prompts (id, slug, name, description, category, status, created_at, updated_at)
     VALUES (gen_random_uuid(), :slug, :name, :description, :category, 'active', now(), now())
     ON CONFLICT (slug) DO NOTHING
     RETURNING id`,
    {
      replacements: {
        slug:        PROMPT_SLUG,
        name:        PROMPT_NAME,
        description: 'Builds the initial context summary for a project from its brief + uploaded/pasted documents (Phase B.5).',
        category:    PROMPT_CATEGORY,
      },
    },
  );

  const prompt_id = (prompt_rows as any[])[0]?.id
    ?? (await qi.sequelize.query<any>(
        `SELECT id FROM prompts WHERE slug = :slug LIMIT 1`,
        { replacements: { slug: PROMPT_SLUG } },
      ))[0][0]?.id;

  if (!prompt_id) throw new Error('Failed to insert/find prompt for project.initial-context');

  const [version_rows] = await qi.sequelize.query<any>(
    `INSERT INTO prompt_versions (id, prompt_id, version, status, system_text, user_template, model, temperature, max_tokens, response_format, response_schema, variables_schema, created_at, updated_at)
     VALUES (gen_random_uuid(), :prompt_id, 1, 'active', :system_text, :user_template, 'gpt-4.1', 0.4, 4000, 'json', :response_schema, :variables_schema, now(), now())
     RETURNING id`,
    {
      replacements: {
        prompt_id,
        system_text:      SYSTEM_TEXT,
        user_template:    USER_TEMPLATE,
        response_schema:  JSON.stringify(RESPONSE_SCHEMA),
        variables_schema: JSON.stringify(VARIABLES_SCHEMA),
      },
    },
  );

  const version_id = (version_rows as any[])[0]?.id;
  if (!version_id) throw new Error('Failed to insert prompt_version for project.initial-context');

  await qi.sequelize.query(
    `UPDATE prompts SET current_version_id = :version_id WHERE id = :prompt_id`,
    { replacements: { version_id, prompt_id } },
  );
};

export const down = async (qi: QueryInterface) => {
  await qi.sequelize.query(`UPDATE prompts SET current_version_id = NULL WHERE slug = :slug`, { replacements: { slug: PROMPT_SLUG } });
  await qi.sequelize.query(`DELETE FROM prompt_versions WHERE prompt_id IN (SELECT id FROM prompts WHERE slug = :slug)`, { replacements: { slug: PROMPT_SLUG } });
  await qi.sequelize.query(`DELETE FROM prompts WHERE slug = :slug`, { replacements: { slug: PROMPT_SLUG } });
  await qi.dropTable('project_initial_context');
};
