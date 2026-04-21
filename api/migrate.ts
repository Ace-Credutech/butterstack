import { query } from './db.ts'

await query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`)
console.log('✓ pg_trgm extension ready')

// ── Users & Auth ──────────────────────────────────────────────────────────
await query(`
  CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  TEXT         NOT NULL,
    mobile         VARCHAR(30)  NOT NULL,
    country_code   VARCHAR(10)  NOT NULL DEFAULT '+91',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email)`)
console.log('✓ users ready')

// ── Communication Logs (email + sms) ──────────────────────────────────────
await query(`
  CREATE TABLE IF NOT EXISTS communication_logs (
    id                SERIAL PRIMARY KEY,
    type              VARCHAR(20)  NOT NULL,
    user_id           INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    to_address        VARCHAR(255) NOT NULL,
    subject           VARCHAR(500),
    body_preview      TEXT,
    status            VARCHAR(30)  NOT NULL DEFAULT 'pending',
    provider_response TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_comm_logs_user ON communication_logs (user_id)`)
await query(`CREATE INDEX IF NOT EXISTS idx_comm_logs_type ON communication_logs (type, created_at DESC)`)
console.log('✓ communication_logs ready')


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

// Projects — top-level scoping entity
await query(`
  CREATE TABLE IF NOT EXISTS projects (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    status      VARCHAR(50)  NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON projects (slug)`)
await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`)
console.log('✓ projects ready')

// ── Project Members ───────────────────────────────────────────────────────
await query(`
  CREATE TABLE IF NOT EXISTS project_members (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(30)  NOT NULL DEFAULT 'collaborator',
    invited_by  INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, user_id)
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_pm_project ON project_members (project_id)`)
await query(`CREATE INDEX IF NOT EXISTS idx_pm_user    ON project_members (user_id)`)
console.log('✓ project_members ready')

// ── Project Invitations ───────────────────────────────────────────────────
await query(`
  CREATE TABLE IF NOT EXISTS project_invitations (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL,
    role        VARCHAR(30)  NOT NULL DEFAULT 'collaborator',
    token       VARCHAR(64)  NOT NULL UNIQUE,
    invited_by  INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    status      VARCHAR(30)  NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_invitations_token ON project_invitations (token)`)
await query(`CREATE INDEX IF NOT EXISTS idx_invitations_email ON project_invitations (email)`)
console.log('✓ project_invitations ready')

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
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS depth              INTEGER NOT NULL DEFAULT 0`)
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS path               TEXT    NOT NULL DEFAULT ''`)
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS raw_title          TEXT`)
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS raw_description    TEXT`)
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS clean_prompt       TEXT`)
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS tokens             JSONB`)
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS tokens_version     INTEGER NOT NULL DEFAULT 0`)
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS content_updated_at TIMESTAMPTZ`)
await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_modules_slug   ON modules (project_id, slug)`)
await query(`CREATE        INDEX IF NOT EXISTS idx_modules_parent ON modules (parent_id)`)
await query(`CREATE        INDEX IF NOT EXISTS idx_modules_path   ON modules (path)`)
console.log('✓ modules ready')

// Version history — persisted on every generate/regenerate
await query(`
  CREATE TABLE IF NOT EXISTS version_history (
    id              SERIAL PRIMARY KEY,
    project_id      VARCHAR(64)  NOT NULL DEFAULT 'default',
    module_id       INTEGER      REFERENCES modules(id) ON DELETE SET NULL,
    label           TEXT         NOT NULL,
    raw_title       TEXT,
    raw_description TEXT,
    clean_prompt    TEXT,
    tokens          JSONB        NOT NULL,
    source          VARCHAR(50),
    approved        BOOLEAN      NOT NULL DEFAULT FALSE,
    approved_at     TIMESTAMPTZ,
    module_path     JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_version_history_project ON version_history (project_id, created_at DESC)`)
await query(`CREATE INDEX IF NOT EXISTS idx_version_history_module  ON version_history (module_id)`)
console.log('✓ version_history ready')

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

// ── Features — capabilities under modules ─────────────────────────────────
await query(`
  CREATE TABLE IF NOT EXISTS features (
    id              SERIAL PRIMARY KEY,
    project_id      VARCHAR(64)  NOT NULL DEFAULT 'default',
    module_id       INTEGER      NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    raw_description TEXT,
    ai_description  TEXT,
    status          VARCHAR(50)  NOT NULL DEFAULT 'draft',
    order_index     INTEGER      NOT NULL DEFAULT 0,
    created_by      INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_features_module  ON features (module_id)`)
await query(`CREATE INDEX IF NOT EXISTS idx_features_project ON features (project_id)`)
console.log('✓ features ready')

// ── Pages — UI screens/views ──────────────────────────────────────────────
await query(`
  CREATE TABLE IF NOT EXISTS pages (
    id              SERIAL PRIMARY KEY,
    project_id      VARCHAR(64)  NOT NULL DEFAULT 'default',
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    page_type       VARCHAR(50),
    raw_description TEXT,
    ai_description  TEXT,
    tokens          JSONB,
    status          VARCHAR(50)  NOT NULL DEFAULT 'draft',
    order_index     INTEGER      NOT NULL DEFAULT 0,
    created_by      INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug    ON pages (project_id, slug)`)
await query(`CREATE INDEX IF NOT EXISTS idx_pages_project        ON pages (project_id)`)
console.log('✓ pages ready')

// ── Page ↔ Feature link ──────────────────────────────────────────────────
await query(`
  CREATE TABLE IF NOT EXISTS page_features (
    id          SERIAL PRIMARY KEY,
    page_id     INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    feature_id  INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (page_id, feature_id)
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_pf_page    ON page_features (page_id)`)
await query(`CREATE INDEX IF NOT EXISTS idx_pf_feature ON page_features (feature_id)`)
console.log('✓ page_features ready')

// ── Elicitation Sessions ──────────────────────────────────────────────────
await query(`
  CREATE TABLE IF NOT EXISTS elicitation_sessions (
    id          SERIAL PRIMARY KEY,
    project_id  VARCHAR(64)  NOT NULL DEFAULT 'default',
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(30)  NOT NULL DEFAULT 'active',
    summary     TEXT,
    context     JSONB        NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_elicit_session_project ON elicitation_sessions (project_id, status)`)
await query(`CREATE INDEX IF NOT EXISTS idx_elicit_session_user    ON elicitation_sessions (user_id)`)
await query(`ALTER TABLE elicitation_sessions ADD COLUMN IF NOT EXISTS title VARCHAR(255)`)
console.log('✓ elicitation_sessions ready')

// ── Elicitation Messages ──────────────────────────────────────────────────
await query(`
  CREATE TABLE IF NOT EXISTS elicitation_messages (
    id           SERIAL PRIMARY KEY,
    session_id   INTEGER      NOT NULL REFERENCES elicitation_sessions(id) ON DELETE CASCADE,
    role         VARCHAR(20)  NOT NULL,
    content      TEXT         NOT NULL,
    message_type VARCHAR(30)  NOT NULL DEFAULT 'text',
    options      JSONB,
    selected     JSONB,
    metadata     JSONB,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`)
await query(`CREATE INDEX IF NOT EXISTS idx_elicit_msg_session ON elicitation_messages (session_id, created_at)`)
console.log('✓ elicitation_messages ready')

// ── Extend modules with documentation fields ─────────────────────────────
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS user_input TEXT`)
await query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS ai_documentation TEXT`)
console.log('✓ modules extended (user_input, ai_documentation)')

process.exit(0)
