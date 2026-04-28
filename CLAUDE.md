# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Butterstack

Intelligent software delivery OS — collapses the full lifecycle (requirements → prototyping → development → QA → versioning) into one platform.

## V2 Engineering Rules (apply to all `v2/` code)

1. **Functional code only.** Every line of a function is a single named, logical step. Orchestrators just compose helpers — they don't contain logic. Example:
   ```ts
   function schedule_course_calendar(p1, p2) {
     const holidays = get_holidays(p1);
     const leaves   = get_leaves(user, p2);
     const courses  = get_courses(p1);
     schedule_course(p1, leaves, holidays, p2);
   }
   ```
2. **BullMQ from Day 1, transport-agnostic.** All producers/workers go through the `QueueClient` interface in `v2/be/src/jobs/queue-client.ts`. Never import `bullmq` outside `v2/be/src/jobs/adapters/`. Designed to swap to RabbitMQ.
3. **Multi-DB ready from Day 1.** All DB access via `db('primary')` factory in `v2/be/src/db/`. Never `import { PrismaClient }` elsewhere.
4. **Slow-query logging mandatory.** Any DB query ≥`SLOW_QUERY_MS` (default 500ms) is logged with model/action, redacted params, duration, caller, traceId, userId, projectId.
5. **Workers organized one-per-file** under `v2/be/src/jobs/workers/<name>.worker.ts`, registered centrally in `queue-registry.ts`.
6. **One WebSocket connection per user — no exceptions.** `WsService` (`v2/fe/src/app/services/ws.service.ts`) is `providedIn: 'root'` and holds exactly one `WebSocket` instance. Calling `ws.on(type, handler)` registers a handler in a local Map — it does NOT open a new connection. Components may call `ws.on()` as many times as needed; they all share the single socket. Never instantiate `WsService` outside the root injector, never open a second `WebSocket` manually.

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

## Graphify

Knowledge graph lives at `graphify-out/`.

- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure.
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files.
- After modifying code files, run:
  ```bash
  python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"
  ```
  to keep the graph current.
