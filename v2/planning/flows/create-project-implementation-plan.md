# Create Project — Implementation Plan (Phased)

Companion to [`create-project.md`](./create-project.md). That doc is the **spec** (what the system should do). This doc is the **plan** (how we build it, in what order, and where each piece lands in code).

> Read this first when picking up implementation work after a context break. Each phase has a Done Criteria — only when all boxes are checked, move to next phase.

---

## Boss's plan delta (2026-04-29) — must reconcile

The boss shared a verbal walkthrough on 2026-04-29 that **adds to and partly reorders** what's in `create-project.md`. Below is each delta, what to do about it, and which phase it lands in. Items marked **DECISION** need an explicit call before that phase ships.

### Additions (not breaking, just extra scope)

| # | What boss added | Where it lands |
|---|----------------|----------------|
| D-1 | **Step 2 — paste-as-text input** alongside file uploads. User should be able to paste a product brief / docs into a textarea, not only upload files. Treat pasted text as a virtual document with `kind='paste'`. | **Phase B** — extend `project.document.upload` payload to accept `inline_text` (no `storage_key` needed) OR add a sibling `project.document.paste` event. Pick one in Phase B kickoff. |
| D-2 | **Project-Specific Context Database with source attribution.** Every parsed snippet/passage must be tagged with which document (or paste) it came from, so the AI's later answers can cite source. | **Phase B + E3** — `document_passages` already has `document_id`. Confirm passages carry source-doc back through Context Bag. Add a `source_id` column to anything the Context Selector emits. |
| D-3 | **Initial Context Markdown** — after Step 2 closes, the system auto-generates a markdown summary of project context, stored in **two forms**: structured JSON + plain markdown text. This is the seed the AI works from in Step 4. | **NEW sub-phase B.5** (or fold into start of E3). Add a `project_initial_context` table (project_id, json_payload, markdown_text, generated_at, prompt_version_id). Triggered by `project.init.step` for step 2 → 'done'. |
| D-4 | **AI clarity confidence score.** Every AI reply in the clarification chat must include "I'm X% confident I understand the requirement, because…". User can challenge: *"if you don't have clarity, why are you claiming you do?"* | **Phase E4** — extend AI response artifact schema with `confidence: { score: 0–1, rationale: string, gaps: string[] }`. UI renders as a chip on the AI message. |
| D-5 | **RBAC matrix output from Roles step.** Roles step is not just chips — it produces a matrix `role × permission × feature`. Boss said: "if we manage this R-BAC properly then all our features are covered." | **Phase C extension** — beyond `project_roles`, add `project_role_permissions` table (project_id, role_id, permission_key, feature_id, allow). Roles step UI grows a matrix editor. |
| D-6 | **Role-capability matrix as a second skeleton output.** When AI proposes the module skeleton, it should also propose **tentative permissions per role per feature**. | **Phase F extension** — `skeleton_revisions.payload_json` includes `role_capability_matrix` alongside `modules_tree`. UI in Step 6 shows both. |
| D-7 | **Draft stage for projects.** Project lives in `status='draft'` from creation through stepper, flips to `status='active'` only on final "Submit Project" click after Step 6 confirm. | **Cross-cutting** — add `status` column to `projects` table (migration in Phase A or piggyback on F). Default `'draft'` for new rows, transitions to `'active'` on `project.init.skeleton.confirm` (or a separate `project.submit` event). |

### Differences from `create-project.md` (DECISIONS needed)

| # | Topic | `create-project.md` says | Boss says | Recommendation |
|---|-------|--------------------------|-----------|----------------|
| **DECISION-1** | **Step order: Roles vs AI Clarification** | Roles is **Step 3** (before AI). Rationale: AI references personas by name from turn 1. | Roles comes **after** AI Clarification — derived from the conversation + RBAC matrix building. | **Need user call.** Hybrid possible: capture role *names* in Step 3 (cheap, lets AI reference them), then build the **full RBAC matrix** in a later expanded roles step after AI Clarification. |
| **DECISION-2** | **Members step (Step 5)** | Real humans building the project — designation, stakeholderRole, authorityRank. | Boss didn't mention members at all. | **Keep it** — Members is for the humans collaborating in the workspace, distinct from app-roles. But verify with user that boss intended to skip or just didn't cover it. |
| **DECISION-3** | **Initial context generation timing** | Built lazily during AI Clarification by Context Selector. | Built explicitly + persisted right after Step 2 closes. Two formats (JSON + markdown). | **Adopt boss's view.** Persist the initial context as an event-derived artifact between Step 2 and Step 4. Context Selector still runs per-turn but starts from this seed, not from raw docs. |
| **DECISION-4** | **Step count** | 6 (Brief, Documents, Roles, AI, Members, Skeleton). | "5–6" — Brief, Documents, AI, Roles, Skeleton, Submit. | If we keep Members, stay at 6. If we drop Members + add explicit Submit, also 6 but different shape. |

### Action: open these as questions for the user before Phase B starts

1. Step order: keep `create-project.md` (Roles before AI) or flip to boss's order (AI before Roles)?
2. Keep Members step or drop?
3. Approve the additions D-1 through D-7?

---

## Status Snapshot (as of 2026-04-29)

### Already in repo
- Events backbone: `apis/events/{dispatcher.ts, post-event, get-event, event_list.ts}`
- Handlers (4): `project.create`, `project.update`, `project.delete`, `member.add`
- Models: Project, ProjectMember, Event, File, Role, User, Document, Organisation, etc.
- Migrations: 001–067
- Frontend: `WsService` (single-WS), auth flow, projects list page

### Not yet built (target of this plan)
Stepper events, document upload event, role events, sessions/AI, skeleton refinement loop, members extended fields, init-state + init hydration, decision log projection.

---

## Phase A — Backbone (Step 1 + Stepper State + Draft status)

**Goal:** end-to-end create-project flow up to "Step 1 done" with resumable stepper. Project lives in `draft` from creation (D-7).

### Backend
- [x] Migration 068: `project_init_steps` table (`project_id`, `step` 1–6, `status` enum `in-progress|done|stale`, `updated_at`)
- [x] Migration 069: `projects.status` column (`draft|active|archived`, default `draft`) — **D-7**
- [x] Model: `ProjectInitStep`
- [x] Model update: `Project` declares `status: ProjectStatus`
- [x] Handler: `project.init.step` (upsert step status, emits `flipped_to_stale` flag in state_delta)
- [x] Handler update: `project.create` explicitly sets `status: 'draft'`, returns it in state_delta
- [x] API: `GET /api/projects/:id/init-state` → returns `{ project_id, project_name, project_slug, project_status, steps, skeleton_revisions }`
- [x] API update: `GET /api/projects` items include `status`
- [x] Register handler in `event_list.ts`; wire orphaned routes (`list_projects`, `post_event`, `get_event`) into `api.list.ts`

### Frontend
- [x] Route: `/app/projects/new` (fresh) and `/app/projects/:id/wizard?step=N` (resume)
- [x] Component: `project-create-wizard` — 6-step stepper shell (Steps 2–6 stubbed with phase labels)
- [x] Step 1 form: name, slug (auto-generated from name, editable), brief
- [x] Submit → `POST /api/events {type:'project.create'}` → on success → `POST /api/events {type:'project.init.step', payload:{step:1, status:'done'}}` → navigate to `/app/projects/:id/wizard?step=2`
- [x] On wizard load with `:id`, hit `GET /init-state` → highlight current step + show project name + draft badge in header
- [x] **D-7 FE**: Draft badge on wizard header + "stays in draft until you submit at the end" copy
- [x] **D-7 FE**: Draft / Archived badges on projects list rows
- [x] `ProjectsService.create_project` + `mark_step` helpers (auto-generate UUIDs for project_id and idempotency_key)

### Done Criteria
- ✅ User can sign in, click "+ New project", fill brief, see project created with `status=draft`, Step 1 marked done in stepper, refresh page and resume at Step 2 with project name + Draft badge visible.

---

## Phase B — Step 2 Documents

### Backend
- [x] Migration 070: `documents.storage_key` made nullable (paste-as-text rows skip storage) — **D-1**
- [x] **D-1**: chosen path — paste rows are `kind='paste'`, `storage_key=null`, `parsed_text=raw`, `parse_status='parsed'` (no worker). Defensive guards added in `documents.routes.ts` and `document-parse.routes.ts` for null `storage_key`.
- [x] Handler: `project.document.paste` — creates Document + DocumentLink in one txn, returns `state_delta.document`
- [x] API: `GET /api/projects/{project_id}/documents` (list — includes pasted entries; uses existing `DocumentLink` with `entity_type='project'`)
- [x] Reused: existing `POST /api/documents/upload` (FormData) supports `entity_type='project'` after adding to `VALID_ENTITY_TYPES`
- [x] Reused: existing `document-parse.worker` for uploads; paste rows skip parser
- [ ] **D-2**: confirm `document_passages` carries `document_id` so source attribution survives into Phase E3 (deferred — verify when Phase B.5 builds)
- [ ] (Deferred — Phase B.5 / later): `POST /api/uploads/sign` presigned URL flow. Current FormData upload is sufficient for Phase B done-criteria.

### Frontend
- [x] Step 2 panel: reuses existing `<bs-documents-panel [entity_type]="'project'" [entity_id]="project_id">` — handles upload, list, search, pagination, slide-over view, parse status, reparse, delete, download
- [x] **D-1**: "Paste content" card in Step 2 — title input + purpose dropdown + textarea + Save → fires `project.document.paste` event → refreshes panel
- [x] "Continue to Step 3" button — fires `project.init.step {step:2, status:'done'}` → navigates to step 3

### Done Criteria
- User uploads a PDF/Excel/MD **and pastes raw text**, all entries land in storage/db, appear in list, parse job kicks off for files.

---

## Phase B.5 — Initial Context Markdown (NEW, from boss's plan D-3)

After Step 2 closes (`project.init.step {step:2, status:'done'}`), the system auto-builds an "initial context" artifact.

### Backend
- [x] Migration 071: `project_initial_context` (project_id PK, status, json_payload JSONB, markdown_text TEXT, prompt_run_id, generated_at, generated_by_event_id, error_message)
- [x] Worker: `initial-context.worker` — queued from `project.init.step` handler when step 2 → done; calls AI via `run_prompt('project.initial-context')`, persists JSON + markdown, broadcasts WS `project.initial-context.status`
- [x] API: `GET /api/projects/:id/initial-context` (returns status + json + markdown)
- [x] **D-2**: every JSON bullet includes `source_document_ids: string[]` so traceability is preserved (passage-level source IDs deferred — only document-level for now).
- [ ] (Deferred until Phase E2) Migrate the `run_prompt` call to the unified `invoke_ai()` helper + `ai_call_log` row.

### Frontend
- [x] After Step 2 done, show "Building initial context…" indicator; on completion render the generated markdown read-only as a sanity check before Step 4. Subscribes to WS `project.initial-context.status` for live updates.

### Done Criteria
- ✅ After step 2 closes, initial context appears in DB in both JSON and markdown form, with `source_document_ids` on every bullet.

---

## Phase C — Step 3 Roles (+ RBAC matrix)

> **DECISION-1 pending**: this phase may run **before** AI Clarification (current spec) or **after** it (boss's plan). Default below assumes spec order; revisit on user call.

### Backend
- [x] Migration 072: `project_roles` table (`id`, `project_id`, `name`, `description`, soft-delete via `deleted_at`, `created_by`/`updated_by`, unique on `(project_id, lower(name))` where not deleted)
- [x] Model: `ProjectRole` (paranoid)
- [x] Handlers: `role.create`, `role.update`, `role.delete` (cascades permissions)
- [x] API: `GET /api/projects/:id/roles`
- [x] **D-5**: Migration 073: `project_role_permissions` (id, project_id, role_id, permission_key, feature_id nullable, allow boolean). `feature_id` is nullable; pre-Phase F all rows live with `feature_id = NULL`. Two unique partial indexes cover both null and non-null feature_id cases.
- [x] **D-5**: Handlers: `role.permission.set` (upsert), `role.permission.unset` (delete cell)
- [x] **D-5**: API: `GET /api/projects/:id/rbac-matrix` (returns `roles`, `permission_keys`, `cells`)

### Frontend
- [x] Step 3 panel: add-role input, role chips with inline edit/delete
- [x] **D-5**: RBAC matrix editor — table of role × `DEFAULT_PERMISSION_KEYS` (`view`, `create`, `edit`, `delete`, `approve`, `export`, `manage_members`), toggle cells. Phase F will replace static keys with feature-driven columns.
- [x] "Continue to Step 4" button — fires `project.init.step {step:3, status:'done'}` → navigates to step 4

### Done Criteria
- ✅ User adds Admin/Teacher/Student roles AND toggles permissions per role; both persist across reload via `GET /roles` + `GET /rbac-matrix`.

---

## Phase D — Step 5 Members (extended)

> Step 5 before 4 because it's simpler and validates the pattern. Step 4 (AI) is the heavy one.

### Backend
- [x] `project_members` already carries `designation`, `stakeholder_role`, `authority_rank` (folded into 005). Migration 074 adds `invited_by` UUID FK so the column matches the `ProjectMember` model (it was declared but not migrated).
- [x] `member.add` handler — captures `invited_by = ctx.actor.id`, case-insensitive email conflict check, activity log, full state_delta of new fields.
- [x] Handlers: `member.update`, `member.remove` (soft-delete via `paranoid: true` on the model).
- [x] API: `GET /api/projects/:id/members` (`list-project-members`) — returns full extended fields, ordered by `authority_rank` then `created_at`.

### Frontend
- [x] Step 5 panel: inline-add row (name, email, designation, stakeholder dropdown, authority rank number) → fires `member.add` event.
- [x] Members table renders with capability badges derived from `stakeholder_role` (decider→Approves/Sets direction, reviewer→Reviews/Comments, contributor→Builds/Edits, observer→Watches/Read-only).
- [x] Inline edit + remove rows wired to `member.update` / `member.remove`.
- [x] "Continue to Step 6" button — fires `project.init.step {step:5, status:'done'}` → navigates to step 6.

### Done Criteria
- ✅ User adds 3 members with full details, table renders, default capabilities shown; reload re-hydrates from `GET /members`.

---

## Phase E — Step 4 AI Clarification (heaviest)

Split into **E1 → E5** sub-phases.

### E1 — Sessions + Messages (no AI yet)
- [ ] Migrations: `sessions` (id, project_id, kind, title, started_by, ended_at), `session_participants`, `messages` (id, session_id, role 'user'|'ai'|'system', content, channel, reply_to, attachments_json, created_at)
- [ ] Models + handlers: `session.start`, `session.end`, `message.add`
- [ ] API: `GET /api/projects/:id/sessions?kind=...`, `GET /api/sessions/:id/messages`
- [ ] FE: chat UI shell, multi-participant list, post message via event

### E2 — `invoke_ai()` helper + `ai_call_log`
- [ ] Migration: `ai_call_log` (id, project_id, session_id?, kind, model, prompt_tokens, completion_tokens, cost_usd, latency_ms, status, created_at)
- [ ] `lib/ai/invoke-ai.ts` — single entry; writes log row; emits `ai.call.recorded`
- [ ] Public facades: `POST /api/ai/respond`, `POST /api/ai/cost-estimate` (thin wrappers)

### E3 — Context Bag + Selector
- [ ] `lib/ai/context-bag.ts` — assembles {brief, parsed docs, roles, members, prior decisions, current session messages, glossary}
- [ ] `lib/ai/context-selector.ts` — bounded subset under token budget; logs selections
- [ ] API: `GET /api/sessions/:id/context-selection-log`

### E4 — `ai.respond.request` event + WS pushes
- [ ] Handler: `ai.respond.request` (dedupe within 2s window per `(sessionId, scope-hash)`)
- [ ] Worker: `ai-respond.worker` — calls `invoke_ai()`, posts `message.add {role:'ai'}` event, emits `ai.thinking.start/end` via WS
- [ ] FE: "Ask AI" button, AI thinking indicator, render AI artifacts as clickable chips
- [ ] **D-4 — Clarity confidence**: AI response artifact schema includes `confidence: { score: 0–1, rationale: string, gaps: string[] }`. Prompt template asks the model to self-rate after each turn.
- [ ] **D-4 FE**: render confidence as a chip on each AI message (e.g., "62% confident — 3 open gaps"). Click → expand rationale + gap list. User can post a follow-up that challenges the score.

### E5 — Quiz Mode + Voice
- [ ] Handlers: `quiz.start`, `quiz.question.add`, `quiz.answer.add`, `quiz.end`
- [ ] API: `POST /api/voice/transcribe` (Whisper)
- [ ] FE: quiz overlay, voice recorder

### Done Criteria
- User starts session, posts messages with another mock participant, clicks "Ask AI", AI replies, decisions extracted on `session.end`.

---

## Phase F — Step 6 Skeleton Refinement Loop

### Backend
- [ ] Migration: `skeleton_revisions` (id, project_id, based_on_revision_id, payload_json, created_by, created_at), `skeleton_nodes` if normalized
- [ ] **D-6**: `payload_json` schema includes both `modules_tree` AND `role_capability_matrix` (rows = roles from Phase C, columns = leaf features in the tree, cells = tentative `allow|deny|conditional`)
- [ ] Handlers: `project.init.skeleton.suggest`, `skeleton.confirm`, `skeleton.node.add/edit/remove`
- [ ] Worker: `skeleton-suggest.worker` — reads context bag + roles + RBAC matrix, calls AI, creates revision with both outputs
- [ ] API: `GET /api/projects/:id/init-skeleton[?revisionId=]`, `GET .../revisions`
- [ ] Stale-step trigger: when Steps 2–5 re-edited, mark step status `stale` via existing `project.init.step` handler
- [ ] Atomic commit: `skeleton.confirm` runs `module.create × N` AND seeds `project_role_permissions` from the role-capability matrix in one transaction
- [ ] **D-7**: on `skeleton.confirm`, do NOT yet flip project to `active` — leave as `draft`. Add separate `project.submit` event that flips `projects.status` to `active`.

### Frontend
- [ ] Step 6 panel: tree viewer of latest revision, inline node edit, "Re-suggest" button, revision history compare
- [ ] **D-6**: second tab/panel in Step 6 — role-capability matrix view (read-only by default; editable inline like the tree)
- [ ] Stale badges on prior steps
- [ ] **D-7**: "Submit project" button below Confirm — fires `project.submit`, then redirects to workspace. Until pressed, project sidebar shows a "Draft" badge.

### Done Criteria
- AI proposes module tree + role-capability matrix, user inline-edits both, re-suggests, confirms → modules and seeded permissions persist; project flips draft → active on Submit → workspace opens.

---

## Phase G — Workspace Hydration + Decision Log

### Backend
- [ ] API: `GET /api/projects/:id/init` — single round-trip: `{project, roles, members, modules, recent_sessions, active_jobs, glossary, lastSequenceNo}`
- [ ] Migration: `decision_log` projection table (id, project_id, source_kind, source_id, content, captured_at, captured_by)
- [ ] Projection rebuild worker (existing `projection-rebuild` worker — extend) listens to `decision.capture`, `quiz.answer.add`, `session.end`, `init.skeleton.confirm`
- [ ] API: `GET /api/projects/:id/decision-log`

### Frontend
- [ ] Workspace home page (replaces wizard once Step 6 done)
- [ ] WS reconnect with `?since=<lastSequenceNo>`
- [ ] Decision Log panel

### Done Criteria
- Confirm Step 6 → workspace loads in one request, decision log shows entries from init.

---

## Cross-cutting (touch in every phase)

- **`idempotencyKey`** — already in events table? confirm; reject duplicates at dispatcher.
- **`sequenceNo`** — `project_sequences` model exists; ensure every event response includes it.
- **`X-Trace-Id`** — propagate header end-to-end (middleware).
- **WS frame ordering** — frames carry `sequenceNo`; FE catch-up via `?since=<seq>`.
- **Slow-query logging** — already mandated by CLAUDE.md V2 rules.
- **Functional code only** — orchestrators compose helpers, no logic inline (CLAUDE.md V2 rule 1).
- **Single AI call site** — only `invoke_ai()` (no direct OpenAI/Anthropic calls elsewhere from Phase E onward).
- **D-7 — Project status (`draft | active | archived`)** ✅ added in Phase A (migration 069). Defaults to `draft` on create, flips to `active` on `project.submit` (event handler comes in Phase F). FE shows Draft badge in wizard header and projects list.

---

## Migration numbering

Continue from **068** onwards.
- 068 — `project_init_steps` ✅ done (Phase A)
- 069 — `projects.status` column (D-7) ✅ done (Phase A)
- 070 — `documents` extension (paste-as-text support — D-1)
- 071 — `project_initial_context` (D-3)
- 072 — `project_roles`
- 073 — `project_role_permissions` (D-5)
- 074 — `project_members` extend (designation, stakeholderRole, authorityRank — already in current model, confirm migration)
- 075 — `sessions` + `session_participants`
- 076 — `messages`
- 077 — `ai_call_log`
- 078 — `quiz_*` tables
- 079 — `skeleton_revisions` (with role_capability_matrix payload — D-6)
- 080 — `decision_log`

### Migration file convention (project-wide)

For every migration, create **two files** with the same number prefix in `v2/be/migrations/`:

1. `NNN-name.ts` — the Sequelize migration (run by `bun run migrate`).
2. `NNN-name.sql` — equivalent raw SQL (`-- ===== UP =====` and `-- ===== DOWN =====` sections), so the user can apply it directly in TablePlus / psql when bypassing the migrator.

Both must stay in lock-step. If you edit one, edit the other. The `.sql` file is documentation + a manual escape hatch — the migrator only reads `.ts`.

---

## Open decisions (defer until phase touches them)

- Storage backend for presigned uploads (S3 / MinIO / local) — Phase B
- AI provider routing per call kind (cheap model for cost-estimate vs respond) — Phase E2
- Quiz mode UX: modal overlay vs inline — Phase E5 (spec says inline)
- Skeleton revision diff UI: side-by-side vs collapsible — Phase F

---

## How to use this doc

1. Open this file at start of any session.
2. Find the current phase (look for first phase with unchecked boxes).
3. Read companion `create-project.md` section for spec details.
4. Implement, tick boxes, commit.
5. When all boxes ticked, run Done Criteria check, move to next phase.
