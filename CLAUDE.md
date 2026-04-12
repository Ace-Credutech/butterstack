# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Butterstack

Intelligent software delivery OS — collapses the full lifecycle (requirements → prototyping → development → QA → versioning) into one platform.

## Dev Commands

```bash
# Development (two terminals)
cd api && bun dev          # API on :3000  (also serves built FE at localhost:3000)
cd web && ng serve         # FE on :4200 with /api proxied to :3000 (HMR)

# Production — single server on :3000
cd web && ng build         # builds to web/dist/web/browser/
cd api && bun dev          # serves API at /api/* + Angular static at /*

# DB migration (run once or after schema changes)
cd api && bun migrate.ts
```

## Architecture

**Stack:** Angular 19 (standalone) · Hono + Bun · PostgreSQL · OpenAI or Anthropic

**Key principle:** Backend returns pure semantic UITokens JSON. Frontend owns all rendering. No HTML from backend.

### API (`api/`)
- `lib/ai-client.ts` — Unified AI client. Switch provider via `AI_PROVIDER=openai|anthropic` in `.env`. Models configurable via `MODEL_STREAMLINE` and `MODEL_TOKENS`.
- `lib/streamline.ts` — Cleans multilingual input (Hinglish/Minglish/Gujarati) → clean English prompt. Uses local dictionary first, AI only when needed.
- `lib/openai.ts` — Extracts UITokens from clean prompt. Two-level cache: exact hash → fuzzy (pg_trgm, threshold 0.88) → AI call.
- `lib/dictionary.ts` — Self-improving in-memory dictionary, flushes to DB every 5s. Grows from every AI response.
- `lib/fuzzy.ts` — pg_trgm similarity lookup. Threshold 0.88 (high — prevents wrong field/entity matches).
- `routes/prototype/generate.ts` — Main generate endpoint.
- `routes/prototype/regenerate.ts` — Regenerate with feedback. Diffs old vs new tokens.
- `routes/modules/create.ts` — Manual module CRUD + recursive tree fetch.
- `routes/modules/auto-assign.ts` — AI auto-assigns approved versions to module/sub-module tree.

### Frontend (`web/src/app/`)
- `renderers/` — Pure functions: UITokens → HTML string. One file per page_type.
- `services/prototype.service.ts` — HTTP calls to API.
- `components/requirement-input/` — Debounce 1000ms, both title+description required.
- `components/prototype-preview/` — Receives UITokens, renders via renderer, DomSanitizer.
- `components/version-timeline/` — Version history, approve/un-approve, module path display, meeting timer.

### DB Tables
- `prompt_cache` — raw input hash → clean English prompt
- `token_cache` — clean prompt hash → UITokens (with fuzzy index, versioning, invalidation)
- `modules` — recursive self-referential tree (id, parent_id, depth, path)
- `local_dictionary` — word mappings learned from AI responses
- `regeneration_log` — feedback + old/new token diffs

## Project Lifecycle Phases

### Phase 1 — Ideation (built)
Blank canvas. User writes requirement in any language → AI generates UITokens → prototype renders. No module assignment yet.

### Phase 2 — Fixture (future)
Decisions locked in. Approved tokens formally promoted into the requirement system. Separate view/mode — do not build until explicitly requested. Key decision needed: is Fixture triggered by approval, or is it a manual mode switch?

### Phase 3 — Changes (partially built)
User writes again → changes flow into the correct module/feature. Versions tracked per module. Auto-assign maps approved versions to module tree via AI.

### Phase 4 — Versions (partially built)
Currently: flat global version list with approve + module path display. Needed later: per-module version timelines, phase context on each version.

## .env Keys

```
AI_PROVIDER=openai|anthropic
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
MODEL_STREAMLINE=        # optional override
MODEL_TOKENS=            # optional override
POSTGRES_DB_STRING=
```

## VS Code

Green color theme (`#215732`) via Peacock extension.
