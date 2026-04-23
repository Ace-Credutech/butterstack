# Flow — Create Project (Sign-in → Workspace Open)

The end-to-end API call sequence for creating a project. This is the **main reference** — everything happening during init is documented here.

For session/conversation possibilities (multi-participant, quiz, attachments, context selection): [`conversations.md`](./conversations.md).
For envelope/conventions referenced below: [`../api/api-catalog.md`](../api/api-catalog.md) cross-cutting block.

---

## Two concepts to keep straight

| Concept | What it is | Example |
|---------|------------|---------|
| **Roles** | User personas inside the **app being built** | Admin, Teacher, Student |
| **Members** | Real humans **building the project** + stakeholder position | Rajneesh — VP / Decider; Akash — BA / Contributor |

## Stepper order (locked — 6 steps)

| Step | Captured | Why here |
|------|----------|----------|
| 1 | Project brief | Bare minimum to create the project row; WS becomes available immediately |
| 2 | Documents (BRDs, Excel, mocks, PDFs) | Static context AI will read |
| 3 | **Roles** | Defined first → AI chat references personas by name from turn 1 |
| 4 | **AI Clarification — 0..N multi-participant chat sessions** | Has brief + documents + roles + decisions from prior closed sessions as context |
| 5 | **Members** (designation + stakeholderRole + authorityRank, inline) | Captured late — scope is now understood |
| 6 | AI module skeleton — refinement loop (versioned, re-entrant earlier steps) → confirm → workspace opens | |

## Cross-cutting (every `POST /api/events` call below assumes)

- `idempotencyKey: <uuid>` (REQUIRED). Generated client-side per intent.
- Server returns `{ id, sequenceNo, appliedAt, stateDelta, jobId?, traceId }`.
- `X-Trace-Id` header propagates end-to-end.
- WS frames carry `sequenceNo` for ordering; FE catches up via `GET /api/projects/:id/events?since=<seq>`.

---

## Phase 0 — Authentication

| # | Call | Purpose |
|---|------|---------|
| 1 | `GET /api/auth/login` | 302 → Keycloak |
| 2 | *(Keycloak login page)* | External |
| 3 | `GET /api/auth/callback?code=...` | Exchange code → set session cookie → redirect home |
| 4 | `GET /api/auth/me` | FE bootstrap — current user |

## Phase 1 — Landing

| # | Call | Purpose |
|---|------|---------|
| 5 | `GET /api/projects` | List projects user has access to. Empty → "Create your first project" CTA |

---

## Phase 2 — Project Creation Stepper

### Step 1 — Brief

| # | Call | Purpose |
|---|------|---------|
| 6 | `POST /api/events` `{ type: 'project.create', payload: { name, slug, brief } }` | Creates project row. `stateDelta.projectId` returned. |
| 7 | **`WS /api/ws?projectId=:id` opens NOW** | Available the moment `project.create` commits — collaborative from this point. Members joining later catch up via `?since=<seq>`. |
| 8 | `POST /api/events` `{ type: 'project.init.step', payload: { step: 1, status: 'done' } }` | Stepper marker (resumable) |

### Step 2 — Documents

| # | Call | Purpose |
|---|------|---------|
| 9 | `POST /api/uploads/sign` `{ filename, mimeType, size, intendedUse: 'project-document' }` | Returns `{ uploadUrl, storageKey, expiresAt }`. Browser PUTs file directly to storage. |
| 10 | `POST /api/events` `{ type: 'project.document.upload', payload: { documentId, filename, mimeType, size, storageKey, kind } }` | Register document. Repeat per file. Server's parser job extracts text → feeds Context Bag. |
| 11 | `GET /api/projects/:id/documents` | Refresh stepper UI (or rely on WS coalesced frame for the burst). |
| 12 | `POST /api/events` `{ type: 'project.init.step', payload: { step: 2, status: 'done' } }` | |

### Step 3 — Roles

| # | Call | Purpose |
|---|------|---------|
| 13 | `POST /api/events` `{ type: 'role.create', payload: { name, description? } }` × N | One per role |
| 14 | `GET /api/projects/:id/roles` | Refresh role chips |
| 15 | `POST /api/events` `{ type: 'project.init.step', payload: { step: 3, status: 'done' } }` | |

### Step 4 — AI Clarification (0..N multi-participant chat sessions)

User can run **multiple clarification sessions** during Step 4 — one per topic, or one per sitting. Each session has its own transcript and its own extracted `Decision[]`. Step 4 closes when the user clicks "I'm done" — independent of session count (zero allowed; user can skip).

**AI replies are NOT auto.** Any message just gets posted; AI is invoked only when someone explicitly asks. See [`conversations.md`](./conversations.md) for the full conversation surface.

#### List & open sessions

| # | Call | Purpose |
|---|------|---------|
| 16 | `GET /api/projects/:id/sessions?kind=project-init-clarify` | List existing sessions (could be 0). FE shows tabs/list with "resume" or "+ new". |
| 17 | `POST /api/events` `{ type: 'session.start', payload: { kind: 'project-init-clarify', title? } }` | Start a new session. Optional `title` ("compliance", "user flows"). Returns `sessionId`. |
| 18 | **`WS /api/ws/sessions/:id` opens** | Per-session presence + typing + AI-thinking |

#### Per-turn loop (within a session)

| # | Call | Purpose |
|---|------|---------|
| 19 | `POST /api/voice/transcribe` *(if voice)* | Audio → text via Whisper |
| 20 | *(optional)* `POST /api/uploads/sign` + browser PUT | Attach a doc / image / audio clip to this message |
| 21 | `POST /api/events` `{ type: 'message.add', payload: { sessionId, role: 'user', content, channel: 'text'\|'voice', replyToMessageId?, mentions?, attachments? } }` | A user (any participant) posts. No AI reply yet. |
| 22 | *(repeat 19–21 — multiple humans, multiple messages, any order)* | |
| 23 | *(optional, before invoking AI)* `POST /api/ai/cost-estimate` `{ kind: 'respond', sessionId, scope, hint? }` | Cost preflight — UI shows expected tokens + USD on the "Ask AI" button |
| 24 | `POST /api/events` `{ type: 'ai.respond.request', payload: { sessionId, scope: 'all-unanswered'\|'last-n'\|'thread-from-message'\|..., scopeArgs?, hint?, contextHint? } }` *(or sync alternative: `POST /api/ai/respond` — same body, returns reply directly; both routes go through the same internal `invoke_ai()` helper and write to `ai_call_log`)* | Explicitly invoke AI. Server dedupes within 2s window per `(sessionId, scope-hash)`. |
| 25 | *(WS push — server-emitted)* `ai.thinking.start` | UI badge: "AI is responding…" |
| 26 | *(WS push — server-emitted)* `message.add { role: 'ai', content, artifacts? }` | AI reply lands. `artifacts` may include `proposedDecisions / proposedFeatures / proposedQuizQuestions / cascadeWarnings` — clickable chips. |
| 27 | *(WS push)* `ai.thinking.end` | |
| 28 | *(repeat as needed)* | Discussion continues; AI invoked again on demand |
| 29 | *(optional)* `POST /api/events` `{ type: 'quiz.start', payload: { sessionId, mode: 'inline' } }` | Enter Quiz Mode for typed Q&A — see [`conversations.md` §6](./conversations.md#6-quiz-mode-typed-qa-overlay) |
| 30 | `POST /api/events` `{ type: 'session.end', payload: { sessionId } }` | Close this session. Triggers Decision-extraction job. |

> **Server-side context (between any user turn and AI reply) — not a client call:**
> The Context Selector reads the session's **Context Bag** (event-derived projection: brief + parsed docs + roles + members + decisions from prior closed sessions + current session messages + open quiz answers + relevant glossary), picks a bounded subset under the token budget, calls AI, emits the reply event. Selection log queryable via `GET /api/sessions/:id/context-selection-log` for cost/quality debugging.

#### Loop sessions

| # | Call | Purpose |
|---|------|---------|
| 31 | *(loop back to 17 to start another clarification session if user wants more topics)* | Multiple sessions accumulate |

#### Close Step 4

| # | Call | Purpose |
|---|------|---------|
| 32 | `POST /api/events` `{ type: 'project.init.step', payload: { step: 4, status: 'done' } }` | Marks Step 4 done. Independent of session count. |

### Step 5 — Members (real stakeholders, captured inline)

No separate authority-ladder. Designation + stakeholderRole + authorityRank live as inline columns. Default project-member capabilities are derived from `stakeholderRole` (decider/reviewer/contributor/observer) — see [`../architecture/03-project-lifecycle-and-rbac.md`](../architecture/03-project-lifecycle-and-rbac.md).

| # | Call | Purpose |
|---|------|---------|
| 33 | `POST /api/events` `{ type: 'member.add', payload: { name, email, designation, stakeholderRole, authorityRank } }` × N | One event per member. New member can connect to the project WS immediately and see live state. |
| 34 | `GET /api/projects/:id/members` | Refresh members table |
| 35 | `POST /api/events` `{ type: 'project.init.step', payload: { step: 5, status: 'done' } }` | |

### Step 6 — AI Module Skeleton — Refinement Loop → Confirm → Workspace

**Not a one-shot.** AI proposes a versioned skeleton; user can re-enter any earlier step (more docs, more clarification sessions, edit roles/members) at any time, then re-suggest. User can also inline-edit the proposed skeleton without a full regen. When satisfied, confirms a specific revision → server commits `module.create × N` atomically.

When an earlier step is re-edited, that step's status flips `done → stale` (system emits `project.init.step.status.changed`).

#### Initial suggestion

| # | Call | Purpose |
|---|------|---------|
| 36 | *(optional)* `POST /api/ai/cost-estimate` `{ kind: 'skeleton-suggest', projectId, hint? }` | Cost preflight |
| 37 | `POST /api/events` `{ type: 'project.init.skeleton.suggest', payload: { hint? } }` | AI reads docs + roles + decisions across all init sessions + members → proposes top-level module tree. Async job. Creates a `skeleton_revision`. |
| 38 | `GET /api/jobs/:id` *(or WS push)* | Wait for ready |
| 39 | `GET /api/projects/:id/init-skeleton` | Latest proposed revision |

#### Refinement options (any, any order, before confirming)

| # | Call | Purpose |
|---|------|---------|
| 40a | Re-enter Step 2 → `POST /api/uploads/sign` + `project.document.upload` | Step 2 → `stale` |
| 40b | Re-enter Step 3 → `role.create` / `role.update` / `role.delete` | Step 3 → `stale` |
| 40c | Re-enter Step 4 → `session.start (kind: 'project-init-clarify')` → new turns → `session.end` | Step 4 → `stale` |
| 40d | Re-enter Step 5 → `member.add` / `member.update` / `member.remove` | Step 5 → `stale` |
| 40e | Inline-edit current revision: `project.init.skeleton.node.add` / `node.edit` / `node.remove` | Tweak a revision without AI |

#### Re-suggest

| # | Call | Purpose |
|---|------|---------|
| 41 | `POST /api/events` `{ type: 'project.init.skeleton.suggest', payload: { hint?, basedOnRevisionId? } }` | New revision incorporating refinements. Loop back to 38. |
| 41a | `GET /api/projects/:id/init-skeleton/revisions` | List for compare/rollback |
| 41b | `GET /api/projects/:id/init-skeleton?revisionId=...` | Fetch specific revision |

#### Confirm

| # | Call | Purpose |
|---|------|---------|
| 42 | `POST /api/events` `{ type: 'project.init.skeleton.confirm', payload: { revisionId } }` | Server commits `module.create × N` in a single transaction. |
| 43 | `POST /api/events` `{ type: 'project.init.step', payload: { step: 6, status: 'done' } }` | Stepper complete → workspace unlocks |

#### Stepper state surface

`GET /api/projects/:id/init-state` returns each step's status (`done | stale | in-progress`) + the list of skeleton revisions. FE uses this to badge re-entered steps and show "stale — refresh skeleton?" CTAs.

---

## Phase 3 — Workspace Open

| # | Call | Purpose |
|---|------|---------|
| 44 | `GET /api/projects/:id/init` | One-shot workspace hydration: project meta + roles + members + module tree + recent sessions + active jobs + glossary summary + `lastSequenceNo`. Single round-trip. |
| 45 | (WS already open from Step 1; reconnect catch-up via `?since=<lastSequenceNo>` if needed) | All future deltas arrive via WS. |

---

## Sidecar references (deeper specs live in their own flow docs)

| Topic | Doc |
|-------|-----|
| Multi-participant chat, quiz mode, attachments, AI invoke routes | [`flows/conversations.md`](./conversations.md) |
| Decision Log + AI conflict-detection soft-prompt + APIs | [`flows/decision-log.md`](./decision-log.md) |
| Token estimates, Context Bag/Selector, AI cost tunables | [`flows/token-estimate.md`](./token-estimate.md) |
| Project lifecycle phases + RBAC matrix | [`../architecture/03-project-lifecycle-and-rbac.md`](../architecture/03-project-lifecycle-and-rbac.md) |

What lands in the Decision Log during init (full spec → [`decision-log.md`](./decision-log.md)):

| Init source | Auto-emits |
|-------------|-----------|
| Step 4 — `session.end` extraction | `decision.capture` per AI-extracted decision |
| Step 4 — `quiz.answer.add` | `decision.capture` per typed answer |
| Step 4 — "Save as decision" chip on AI artifact | `decision.capture` |
| Step 6 — `init.skeleton.confirm` | `decision.capture` for module-level structural decisions |

---

## Patterns

- **Single write path** — every mutation is `POST /api/events` with `idempotencyKey`.
- **WS lives from Step 1** — multi-member init is collaborative end-to-end.
- **Resumable stepper** — `project.init.step` markers + `init-state` lets users close tab and return.
- **Files bypass server** — presigned upload, then register via event.
- **AI is explicit** — `ai.respond.request` invokes AI; cost preflight available before any AI call.
- **AI artifacts sidecar** — AI replies carry clickable chips for proposed decisions/features/quiz questions; one click = one event.
- **Roles before AI chat** — AI references personas by name from turn 1.
- **Members late** — captured after scope is understood; authority inline.
- **Step 6 is a loop** — versioned revisions; earlier steps re-entrant; atomic confirm.
- **One AI helper, one log table** — `invoke_ai()` is the only AI call site; every call writes a row to `ai_call_log` and emits `ai.call.recorded`. Public `/api/ai/*` endpoints are thin facades over the same helper.
- **Decision Log is a projection** — every quiz answer + every AI-extracted decision + every manual capture lands in one project-wide ledger surfaced via `GET /api/projects/:id/decision-log`.

---

## Open questions

| # | Question |
|---|----------|
| F-1 | Re-open clarification chat post-workspace as `kind: 'planning'` session? Recommendation: yes. |
| F-2 | Document parsing sync at upload time or lazy on first AI context-assemble? |
| F-3 | Re-suggest skeleton when members change later — explicit only, or auto? Currently explicit. |
| F-4 | Cap on init clarification sessions per project (soft limit ~10 for context cost)? |
