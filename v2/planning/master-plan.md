# Butterstack-2 — Master Plan

_Starting from zero with everything we learned from v1. API-first, event-sourced, edit-stable by design. Same domain, cleaner foundation._

---

## 0. Ground Rules

- **Database**: `butterstack-2` (not `butterstack`). Env var `POSTGRES_DB=butterstack-2` in both `be/.env` and CI.
- **Folders**:
  - `be/` — backend (Hono on Bun, Postgres)
  - `fe/` — frontend (Angular 19 standalone)
  - `planning/` — specs, roadmap, API contracts, migration notes (this folder)
- **Approach**: **API-first**. Contract is frozen before either side writes code. Contract lives in `planning/api-contract.md` + generated OpenAPI.
- **Nothing ported verbatim** from v1. Every file in `be/` and `fe/` is a fresh decision, referencing v1 as guidance, not as source.

---

## 1. Why a v2

v1 works but leaks at every seam:

| Seam | v1 pain | v2 cure |
|---|---|---|
| Section classification | regex on label text at render time | role stored on event capture, never re-inferred |
| Vocabulary | drifts (username → email) | project glossary as first-class, required in every prompt |
| Regeneration | touches whole blob | field-scoped LLM calls on StructuredDoc |
| Context passing | stitched inside each prompt function | one typed `Context` object, explicitly assembled |
| Scope of an edit | `touchedByUser()` heuristic after the fact | event carries scope by construction |
| User edits overwritten by AI | regenerator doesn't know what's user-sourced | `TextSlot.source: 'user' \| 'ai' \| 'default'` |
| Cache poisoning | keyed on prompt hash only | keyed on (prompt + glossary + doc version) |
| Stale tokens | mitigated with `bypassCache: true` flags sprinkled around | projections are derived, never cached at this layer |
| Page-for-feature guarantee | safety net in complete flow | type constraint: every feature requires ≥ 1 linked page |
| Cross-session context | free-text summaries | typed `Decision[]` emitted by classifier |

---

## 2. Architecture — 4 Layers

```
┌─────────────────────────────────────────────────────┐
│ LAYER 4: Surfaces    Workspace · Prototype · BRD   │
├─────────────────────────────────────────────────────┤
│ LAYER 3: Projections StructuredDoc · UITokens      │
│                      (typed Blocks) · DEASV        │
├─────────────────────────────────────────────────────┤
│ LAYER 2: Events      user.message · plan.confirm    │
│                      feature.rename · slot.set      │
├─────────────────────────────────────────────────────┤
│ LAYER 1: State       Project tree · Glossary        │
│                      · Events log                   │
└─────────────────────────────────────────────────────┘
```

Reads go down. Writes go up. Projections are fully rebuildable from state + events.

---

## 3. Backend (`be/`)

### 3.1 Stack
- **Runtime**: Bun 1.x
- **HTTP**: Hono
- **DB**: Postgres (`butterstack-2`)
- **Auth**: JWT via `jose`
- **AI**: unified client, OpenAI + Anthropic swappable
- **Validation**: Zod on every route input + output
- **OpenAPI**: auto-generated from Zod schemas

### 3.2 Layout

```
be/
├── src/
│   ├── index.ts              # Hono app
│   ├── env.ts                # typed env loader
│   ├── db.ts                 # pg pool + typed query helper
│   ├── schema.sql            # authoritative schema (no migrate.ts drift)
│   ├── migrations/           # versioned, applied on boot
│   │
│   ├── domain/               # pure types, no I/O
│   │   ├── project.ts
│   │   ├── module.ts
│   │   ├── feature.ts
│   │   ├── page.ts
│   │   ├── doc.ts            # StructuredDoc type
│   │   ├── tokens.ts         # typed Block[] UITokens
│   │   ├── glossary.ts
│   │   ├── events.ts         # Event union
│   │   └── context.ts        # Context object
│   │
│   ├── events/               # event bus + handlers
│   │   ├── dispatcher.ts
│   │   ├── handlers/
│   │   │   ├── module.ts
│   │   │   ├── feature.ts
│   │   │   ├── page.ts
│   │   │   └── plan.ts
│   │   └── projector.ts      # state → projections
│   │
│   ├── ai/                   # the intelligence layer
│   │   ├── client.ts         # OpenAI + Anthropic unified
│   │   ├── streamline.ts     # multilingual → English
│   │   ├── classifier.ts     # user.message → typed intent
│   │   ├── planner.ts        # domain ask → BreakdownPlan
│   │   ├── doc-writer.ts     # field-scoped StructuredDoc gen
│   │   ├── token-extractor.ts # doc → typed Blocks
│   │   └── prompts/          # one file per prompt, testable
│   │
│   ├── routes/               # HTTP surface (thin, Zod-validated)
│   │   ├── auth.ts
│   │   ├── projects.ts
│   │   ├── modules.ts
│   │   ├── features.ts
│   │   ├── pages.ts
│   │   ├── events.ts         # single event intake
│   │   ├── sessions.ts       # conversation
│   │   ├── exports.ts        # BRD/XLSX/mindmap
│   │   ├── jobs.ts           # job status polling
│   │   └── ws.ts             # WebSocket for live updates
│   │
│   └── jobs/                 # background work
│       ├── queue.ts          # Postgres-backed queue
│       ├── runner.ts
│       └── steps/            # one file per projection step
│
└── tests/                    # integration + unit, colocated where useful
```

### 3.3 API-first contract

Single intake for mutations: `POST /api/events`. Body is a discriminated union. Server validates, applies to state tree in a transaction, enqueues projection job, returns job id + applied-state diff.

Reads are RESTful resource endpoints (GET only).

See `planning/api-contract.md` for the full list.

### 3.4 What's NOT in v2

- No 2-level prompt/token cache (projections are derived, regeneration is cheap field-scoped)
- No `reprocess_jobs` as a separate table — unified `jobs` table
- No separate `regeneration_log` — events table already is the log
- No free-text summaries — `Decision[]` typed
- No `touchedByUser()` heuristic — event carries scope
- No legacy `prototype/generate` Phase-1 endpoints

---

## 4. Frontend (`fe/`)

### 4.1 Stack
- **Angular 19** standalone, signals, no NgModules
- **Router**: lazy per page
- **State**: signals + service classes, no NgRx
- **HTTP**: typed client generated from OpenAPI (one source of truth with backend)
- **WS**: single connection, typed messages
- **Rendering**: pure block-dispatch renderer, no regex on labels

### 4.2 Layout

```
fe/
├── src/app/
│   ├── app.config.ts
│   ├── app.routes.ts
│   ├── pages/
│   │   ├── landing/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── workspace/            # the big one
│   │   └── confidence/
│   │
│   ├── components/
│   │   ├── tree-panel/           # left: modules + features
│   │   ├── center-panel/         # center: Details/Prototype/BRD/Excel/Mindmap
│   │   ├── conversation-panel/   # right: sessions + chat
│   │   ├── prototype-iframe/     # isolated iframe w/ slot-edit elements
│   │   ├── doc-view/             # StructuredDoc → cards
│   │   ├── confidence-bars/
│   │   └── quiz-modal/
│   │
│   ├── renderers/
│   │   ├── dispatch.ts           # switch(block.kind)
│   │   ├── blocks/               # one file per block kind
│   │   │   ├── header.ts
│   │   │   ├── form.ts
│   │   │   ├── table.ts
│   │   │   ├── stats.ts
│   │   │   ├── section.ts
│   │   │   └── aux.ts
│   │   └── shell.ts              # layout wrappers
│   │
│   ├── iframe/                   # runtime injected into prototype iframe
│   │   ├── slot-edit.ts          # custom element per editable slot
│   │   └── interactions.ts       # form validate / sort / password toggle
│   │
│   ├── api/                      # generated from OpenAPI
│   │   ├── generated/
│   │   └── client.ts             # thin wrapper with auth header
│   │
│   ├── state/                    # signal-based stores
│   │   ├── auth.store.ts
│   │   ├── workspace.store.ts
│   │   ├── events.bus.ts         # outgoing event dispatcher
│   │   └── ws.store.ts
│   │
│   └── domain/                   # mirror of backend types (from OpenAPI)
```

### 4.3 Key differences from v1 FE

- No `data-tp` attribute scraping. Slots are first-class custom elements.
- No `normalizeTokens()` at load time. Server sends already-normalized Blocks.
- No `setByPath` string-path hacks. Every edit is a typed `slot.set` event.
- No `@HostListener('window:message')` for 2 unrelated things. One iframe-bridge service.
- No `applyUrlState` racing with `ngOnInit`. Workspace resolver loads init data as route data.

---

## 5. Database Schema — First Pass

```sql
-- Tenancy
users                (id, email, name, password_hash)
projects             (id, owner_id, name, created_at, updated_at)
project_members      (project_id, user_id, role)

-- Tree
modules              (id, project_id, parent_id, depth, path, name, order_index)
features             (id, module_id, name, raw_intent, pm_status,
                      confidence jsonb, provenance_events int[])
pages                (id, project_id, name, page_type, layout,
                      tokens jsonb,             -- typed Blocks
                      provenance_events int[])
page_features        (page_id, feature_id)

-- Feature documentation (typed, not markdown blob)
feature_doc          (feature_id PK, structured_doc jsonb, updated_at)

-- Vocabulary
glossary_terms       (id, project_id, canonical, user_word,
                      scope jsonb,              -- where this applies
                      first_seen_event int)

-- Events (append-only log, source of truth)
events               (id, project_id, actor_id, type, payload jsonb,
                      scope jsonb, source text, created_at)

-- Conversations
sessions             (id, project_id, user_id, status, summary jsonb, -- typed Decision[]
                      created_at, updated_at)
messages             (id, session_id, role, content, kind, payload jsonb, created_at)

-- Jobs (unified — projection rebuilds, imports, exports)
jobs                 (id, project_id, kind, scope jsonb, status, step, error,
                      created_at, started_at, finished_at)

-- Confidence
quiz_sessions        (id, feature_id, user_id, answers jsonb, completed_at)

-- Comments / review
comments             (id, entity_type, entity_id, user_id, content, resolved, created_at)

-- Misc
usage_events         (id, user_id, provider, model, in_tokens, out_tokens, cost_usd)
api_keys             (id, user_id, provider, encrypted_key)
```

No cache tables. If a projection is slow, we memoize in-process — DB cache layers create drift bugs.

---

## 6. Phased Roadmap

### Phase 0 — Scaffolding (Day 1–2)
- [ ] `be/` skeleton with Hono + Bun + env + db + health check
- [ ] `fe/` skeleton with Angular 19 standalone + router + landing page
- [ ] OpenAPI pipeline wired (backend emits, frontend consumes)
- [ ] `butterstack-2` db created, schema.sql applied
- [ ] Auth (signup / login / me) working end-to-end

### Phase 1 — State & Events (Day 3–5)
- [ ] Projects CRUD
- [ ] Modules CRUD (with recursive tree endpoint)
- [ ] Features CRUD
- [ ] Pages CRUD
- [ ] Events intake endpoint + dispatcher
- [ ] WebSocket wiring for live updates
- [ ] Tree panel on FE, showing real data

### Phase 2 — Conversation (Day 6–8)
- [ ] Sessions + messages
- [ ] Streamliner (multilingual → English)
- [ ] Classifier (message → typed intent)
- [ ] Planner (plan.propose → BreakdownPlan)
- [ ] Conversation panel on FE, quiz-style + plan-proposal UI

### Phase 3 — Projections (Day 9–12)
- [ ] StructuredDoc generator (field-scoped)
- [ ] UITokens Block extractor
- [ ] Projection job runner
- [ ] Live step updates via WebSocket
- [ ] Doc view + prototype iframe on FE

### Phase 4 — Editing (Day 13–15)
- [ ] Slot-edit custom element in iframe
- [ ] `slot.set` event path end-to-end
- [ ] Inline rename on tree nodes + doc headings
- [ ] Delete with cascade warnings
- [ ] Glossary auto-captures user edits

### Phase 5 — Exports & Polish (Day 16–18)
- [ ] BRD generator (StructuredDoc → HTML)
- [ ] Excel exporter (sheets from typed data)
- [ ] Mindmap interactive canvas
- [ ] Shareable public link

### Phase 6 — Intelligence (Day 19–21)
- [ ] DEASV confidence scoring (computed live)
- [ ] Quiz generator + scoped field updates
- [ ] Suggestions engine

### Phase 7 — Migration (Day 22+)
- [ ] v1 → v2 data import script
- [ ] Parity tests
- [ ] Switch traffic

---

## 7. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Typed StructuredDoc is stricter than free-text — LLM may not comply | Zod validation + repair loop + field-scoped calls keep output small |
| API-first means coordination overhead between FE/BE | OpenAPI emission + generated FE client removes the manual contract drift |
| Projection jobs could fall behind on heavy projects | Jobs run in-process initially; move to separate worker only if needed |
| Event log grows unbounded | Partition by project + archive events older than N months |
| Glossary could bloat | Cap per-project; dedup on canonical |

| Open question | Decision needed by |
|---|---|
| Hosted AI only or BYO-key default? | Phase 0 |
| One WebSocket or SSE? | Phase 1 |
| Real-time collaboration (multi-cursor) in v2 or later? | Phase 4 |
| Mobile app or responsive web only? | Phase 5 |

---

## 8. Reference Artefacts

- `planning/api-contract.md` — full REST + events surface
- `planning/feature-parity.csv` — v1 feature → v2 status tracker (open in Excel)
- `planning/schema.sql` — authoritative DB schema (pulled from `be/src/schema.sql`)
- `docs/toal-current-work.md` — v1 walkthrough (reference only, don't port verbatim)

---

## 9. Definition of Done (v2 GA)

- [ ] Fresh user can sign up, create a project, have a conversation, and see a live prototype in < 5 minutes
- [ ] Every user-edited text survives every regeneration — no exceptions
- [ ] Vocabulary preserved across 100% of exports (measured via automated glossary-adherence test)
- [ ] Role-based section routing has zero regex on label text in the render path
- [ ] All backend routes have Zod schemas + auto-generated OpenAPI
- [ ] FE client is 100% generated from OpenAPI, no hand-written `api.service.ts` signatures
- [ ] Every mutation goes through `POST /api/events` — no side-channel write endpoints
- [ ] Full parity with v1 feature set (tracked in `feature-parity.csv`)
