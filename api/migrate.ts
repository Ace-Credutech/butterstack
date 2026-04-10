import { query } from './db.ts'

await query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`)
console.log('✓ pg_trgm extension ready')

await query(`
  CREATE TABLE IF NOT EXISTS internal_api_logs (
    id            SERIAL PRIMARY KEY,
    endpoint      VARCHAR(255) NOT NULL,
    method        VARCHAR(10)  NOT NULL DEFAULT 'POST',
    title         TEXT,
    description   TEXT,
    request_body  JSONB,
    response_body JSONB,
    duration_ms   INTEGER,
    status        VARCHAR(50)  NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`ALTER TABLE internal_api_logs ADD COLUMN IF NOT EXISTS request_body  JSONB`)
await query(`ALTER TABLE internal_api_logs ADD COLUMN IF NOT EXISTS response_body JSONB`)
console.log('✓ internal_api_logs ready')

await query(`
  CREATE TABLE IF NOT EXISTS openai_logs (
    id            SERIAL PRIMARY KEY,
    endpoint      VARCHAR(255) NOT NULL,
    model         VARCHAR(100) NOT NULL,
    prompt_sent   TEXT,
    response_raw  TEXT,
    tokens_in     INTEGER,
    tokens_out    INTEGER,
    tokens_total  INTEGER,
    duration_ms   INTEGER,
    status        VARCHAR(50)  NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
console.log('✓ openai_logs ready')

// Level 1 cache: raw input → clean prompt
await query(`
  CREATE TABLE IF NOT EXISTS prompt_cache (
    id               SERIAL PRIMARY KEY,
    raw_hash         VARCHAR(64)  UNIQUE NOT NULL,
    raw_title        TEXT,
    raw_description  TEXT,
    clean_prompt     TEXT         NOT NULL,
    invalidated      BOOLEAN      NOT NULL DEFAULT FALSE,
    hit_count        INTEGER      NOT NULL DEFAULT 0,
    last_hit_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_prompt_cache_hash ON prompt_cache (raw_hash)`)
console.log('✓ prompt_cache ready')

// Level 2 cache: clean prompt → semantic tokens (versioned)
await query(`
  CREATE TABLE IF NOT EXISTS token_cache (
    id               SERIAL PRIMARY KEY,
    prompt_hash      VARCHAR(64)  UNIQUE NOT NULL,
    clean_prompt     TEXT,
    tokens           JSONB        NOT NULL,
    previous_tokens  JSONB,                          -- last version before update
    version          INTEGER      NOT NULL DEFAULT 1,
    invalidated      BOOLEAN      NOT NULL DEFAULT FALSE,
    hit_count        INTEGER      NOT NULL DEFAULT 0,
    last_hit_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_token_cache_hash    ON token_cache (prompt_hash)`)
await query(`CREATE INDEX IF NOT EXISTS idx_token_cache_prompt  ON token_cache USING gin (clean_prompt gin_trgm_ops)`)
console.log('✓ token_cache ready')

// Shared project-level tokens (nav, layout, brand — inherited by all pages)
await query(`
  CREATE TABLE IF NOT EXISTS project_tokens (
    id           SERIAL PRIMARY KEY,
    project_id   VARCHAR(64)  NOT NULL DEFAULT 'default',
    navigation   JSONB        NOT NULL DEFAULT '[]',
    brand_color  VARCHAR(20)  NOT NULL DEFAULT 'green',
    layout       VARCHAR(50)  NOT NULL DEFAULT 'sidebar-main',
    entity_map   JSONB        NOT NULL DEFAULT '{}',  -- e.g. { "user": "Business Analyst" }
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_project_tokens_project ON project_tokens (project_id)`)
console.log('✓ project_tokens ready')

// Betterment feedback log
await query(`
  CREATE TABLE IF NOT EXISTS regeneration_log (
    id            SERIAL PRIMARY KEY,
    raw_hash      VARCHAR(64),
    prompt_hash   VARCHAR(64),
    feedback      TEXT,
    old_tokens    JSONB,
    new_tokens    JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
console.log('✓ regeneration_log ready')

// Modules — recursive self-referential tree (module → sub-module → sub-sub-module → ...)
await query(`
  CREATE TABLE IF NOT EXISTS modules (
    id           SERIAL PRIMARY KEY,
    project_id   VARCHAR(64)  NOT NULL DEFAULT 'default',
    name         VARCHAR(255) NOT NULL,
    slug         VARCHAR(255) NOT NULL,
    parent_id    INTEGER      REFERENCES modules(id) ON DELETE CASCADE,
    depth        INTEGER      NOT NULL DEFAULT 0,   -- 0=root, 1=sub, 2=sub-sub, ...
    path         TEXT         NOT NULL DEFAULT '',  -- e.g. "auth/login/form" — full ancestry path
    order_index  INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS depth       INTEGER NOT NULL DEFAULT 0`)
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS path        TEXT    NOT NULL DEFAULT ''`)
await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_modules_slug   ON modules (project_id, slug)`)
await query(`CREATE        INDEX IF NOT EXISTS idx_modules_parent ON modules (parent_id)`)
await query(`CREATE        INDEX IF NOT EXISTS idx_modules_path   ON modules (path)`)
console.log('✓ modules ready')

// Requirements — stored as they are typed, assigned to module
await query(`
  CREATE TABLE IF NOT EXISTS requirements (
    id              SERIAL PRIMARY KEY,
    project_id      VARCHAR(64)  NOT NULL DEFAULT 'default',
    module_id       INTEGER      REFERENCES modules(id) ON DELETE SET NULL,
    title           TEXT         NOT NULL,
    description     TEXT,
    clean_prompt    TEXT,                    -- streamlined version
    tokens          JSONB,                   -- last extracted UITokens
    status          VARCHAR(50)  NOT NULL DEFAULT 'draft',  -- draft | review | approved | rejected
    version         INTEGER      NOT NULL DEFAULT 1,
    created_by      VARCHAR(100) NOT NULL DEFAULT 'BA',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_requirements_module    ON requirements (module_id)`)
await query(`CREATE INDEX IF NOT EXISTS idx_requirements_project   ON requirements (project_id)`)
console.log('✓ requirements ready')

// Self-improving local dictionary — grows with every AI response
await query(`
  CREATE TABLE IF NOT EXISTS local_dictionary (
    id            SERIAL PRIMARY KEY,
    raw_word      VARCHAR(255) NOT NULL,
    clean_word    VARCHAR(255) NOT NULL,
    category      VARCHAR(50)  NOT NULL DEFAULT 'hinglish',  -- hinglish | ui_keyword | pattern
    confidence    FLOAT        NOT NULL DEFAULT 0.5,
    frequency     INTEGER      NOT NULL DEFAULT 1,           -- how many times AI confirmed this
    source        VARCHAR(50)  NOT NULL DEFAULT 'ai',        -- ai | manual
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (raw_word, category)
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_dict_raw_word ON local_dictionary (raw_word)`)
console.log('✓ local_dictionary ready')

process.exit(0)
