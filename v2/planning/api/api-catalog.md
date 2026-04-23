# Butterstack V2 — API Catalog

**Convention:** single write path (`POST /api/events`); reads are GET; AI calls have a dedicated namespace (Section H); WebSocket for live updates.

## Cross-cutting (apply to every endpoint)

- **Idempotency:** `POST /api/events` requires `idempotencyKey` (UUID; body field or `X-Idempotency-Key`). Retries with same key return original response.
- **Sequence numbers:** every accepted event gets a monotonic `sequenceNo` per project. Returned in body + `X-Sequence-No`. FE orders by it.
- **Trace IDs:** `X-Trace-Id` accepted, generated if absent, echoed in every response and WS frame. Propagates into AI calls and slow-query logs.
- **Catch-up:** `GET /api/projects/:id/events?since=<sequenceNo>` after WS reconnect.
- **Coalesced WS frames:** server batches in 50ms windows; frame carries `events: [...]`.
- **Soft-delete:** `<entity>.delete` events are tombstones; `?includeDeleted=true` to read.
- **Errors:** JSON body `{ error: { code, message, details, traceId } }`. Status 400/401/403/404/409/422/429/500.
- **Pagination:** cursor — `?cursor=<opaque>&limit=<n>` (default 50, max 200).
- **Single AI entry point.** All AI communication — public endpoints, event projectors, BullMQ workers, conflict detector, prototype generator — goes through one internal helper: `be/src/ai/invoke.ts → invoke_ai()`. Public `/api/ai/*` endpoints (Section H) are thin facades over this helper. **No code path bypasses it.**
- **Every AI call is logged in DB.** `invoke_ai()` always writes a row to `ai_call_log` and emits `ai.call.recorded`. When the call was preflighted via `/api/ai/cost-estimate`, the row is linked back to its `ai_estimate_log` entry and **estimate-vs-actual variance is computed and stored** (token / cost variance %, verdict `under|on|over`).

---

## Section index

| # | Section | What lives here |
|---|---------|-----------------|
| A | Auth | Keycloak login, callback, me, logout |
| B | Projects | List, detail, members, roles, documents, init-state, init-skeleton |
| C | Workspace bootstrap | One-shot hydration |
| D | Tree reads | Modules, features, pages |
| E | RBAC | Capability matrix + cells |
| F | Sessions & messages | Conversation reads, attachments, quiz, context-bag, selection-log |
| G | Events | Single write surface + log reads + audit feed |
| **H** | **AI Communication** | **Generic invoke + cost preflight + call-log reads. Same internal helper used by event projectors.** |
| I | AI Prompts (configurable) | Templates + versions + test runs |
| J | Jobs | Status (sync fallback to WS) |
| K | Versions | Snapshots, diffs, restore previews |
| L | Exports | BRD/Excel/Mindmap/Share-link |
| M | Glossary | Terms + cross-project suggestions |
| N | Comments | Polymorphic |
| O | Usage / cost | Roll-ups + raw `ai_call_log` reads |
| P | Voice | Transcription |
| Q | Uploads | Presigned PUT URLs |
| R | WebSocket | Three channels |
| S | Health | live / ready |
| **T** | **Decision Log** | **Project-wide append-only ledger of formal decisions. Aggregates `decision.capture` across all sessions + manual entries.** |

---

## A. Auth

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auth/login` | 302 → Keycloak |
| GET | `/api/auth/callback` | Set session cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current user |

## B. Projects

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects` | List projects user has access to |
| GET | `/api/projects/:id` | Project detail (brief, counts) |
| GET | `/api/projects/:id/members` | Members with designation + stakeholderRole + authorityRank inline |
| GET | `/api/projects/:id/roles` | System personas (app being built) |
| GET | `/api/projects/:id/documents` | Step-2 uploaded documents |
| GET | `/api/projects/:id/init-state` | Stepper status — per-step `done`/`stale`/`in-progress` + skeleton revisions list |
| GET | `/api/projects/:id/init-skeleton` | Latest proposed module tree. `?revisionId=...` for a specific one |
| GET | `/api/projects/:id/init-skeleton/revisions` | All revisions (compare/rollback) |

Mutations: `project.*`, `role.*`, `member.*`, `project.init.skeleton.*`, `project.document.*` events.

## C. Workspace bootstrap

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/init` | **One-shot workspace hydration.** Single round-trip — covers everything the workspace needs to render its first paint: project meta + roles + members + module tree + recent sessions + active jobs + glossary summary + stepper status (`init-state` data) + skeleton revisions list + top N active decisions + capability matrix summary (counts) + `lastSequenceNo`. Tab-specific deep loads (full capability matrix, full decision log, glossary, audit, usage) happen lazily when the user opens that tab. |

## D. Tree reads

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/modules` | Recursive module tree |
| GET | `/api/modules/:id` | Single module + child features |
| GET | `/api/features/:id` | Feature + context layers + linked pages |
| GET | `/api/features/:id/raw-inputs` | Raw inputs (text/voice/file/quiz) |
| GET | `/api/raw-inputs/:id` | Single raw input + attachments + history |
| GET | `/api/narratives/:id` | Single free-text narrative + edit history |
| GET | `/api/features/:id/tokens` | Typed requirement tokens |
| GET | `/api/features/:id/narratives` | Free-text narratives |
| GET | `/api/features/:id/doc` | StructuredDoc sections |
| GET | `/api/pages/:id` | Page + blocks + fields |
| GET | `/api/pages/:id/features` | Features linked via M×N |

## E. RBAC — Capability matrix

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/capability-matrix` | Role × Module/Feature/Page grid. `?withNarratives=true` includes per-cell paragraph |
| GET | `/api/capability-cells/:id` | Single cell — flag + narrative + edit history |

Mutations: `capability.*` events.

## F. Sessions & messages

See [`flows/conversations.md`](../flows/conversations.md) for the full surface.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/sessions` | Session list. `?kind=project-init-clarify\|planning\|feature\|meeting` filter |
| GET | `/api/sessions/:id` | Session + summary + participants + status |
| GET | `/api/sessions/:id/messages` | Paginated messages (cursor) |
| GET | `/api/sessions/:id/decisions` | Typed decisions captured in this session |
| GET | `/api/sessions/:id/attachments` | All attachments referenced in this session |
| GET | `/api/sessions/:id/quiz-questions` | Active + past quiz questions |
| GET | `/api/sessions/:id/context-bag` | Materialized context bag (debug/audit) |
| GET | `/api/sessions/:id/context-selection-log` | Last AI call's chosen vs skipped items + reasons |
| GET | `/api/attachments/:storageKey/download` | Signed URL for an attachment |

Mutations: `session.*`, `message.*`, `decision.*`, `quiz.*`, `ai.respond.*` events.

## G. Events

| Method | Path | Purpose |
|--------|------|---------|
| **POST** | **`/api/events`** | Single write surface. Body = envelope (see [`events-catalog.md`](./events-catalog.md)) |
| GET | `/api/projects/:id/events` | Event log; filterable `?type=`, `?actorId=`, `?entityType=`, `?entityId=`, `?since=<seq>` |
| GET | `/api/events/:id` | Single event + affected entities + traceId |
| GET | `/api/projects/:id/audit-feed` | Per-actor/per-entity/per-trace audit projection |

## H. AI Communication

> **Every AI call — whether triggered here or by an event projector — flows through the same internal `invoke_ai()` helper and writes a row to `ai_call_log`.** This endpoint is the public face of that helper.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ai/invoke` | **Generic AI call.** Body: `{ kind, promptId?, inputs, contextScope?: { sessionId? \| projectId? \| featureId?, mustInclude?, exclude? }, hint?, estimateId?, dryRun?: bool, stream?: bool }`. Returns `{ callId, responseText, artifacts?, contextItemsChosen, provider, model, inTokens, outTokens, costUsd, estimateId?, tokenVariancePct?, costVariancePct?, verdict?, traceId }`. With `stream: true` switches to SSE. |
| POST | `/api/ai/cost-estimate` | Preflight (no provider call). Returns `{ estimateId, provider, model, expectedInTokens, expectedOutTokens, expectedCostUsd, contextItemsChosenSummary }`. Writes a row to `ai_estimate_log`. Pass the returned `estimateId` to a later `/invoke` to link estimate → actual for variance tracking. |
| POST | `/api/ai/respond` | Sugar over `/invoke` for conversational replies. Equivalent to `ai.respond.request` event but synchronous request/response (still logged to `ai_call_log`). Body: `{ sessionId, scope, scopeArgs?, hint?, contextHint?, estimateId? }`. |
| GET | `/api/ai/calls/:callId` | Full record of a single AI call: request, response, context items chosen, prompt template id+version, tokens, cost, duration, **estimate-vs-actual variance**, error |
| GET | `/api/projects/:id/ai/calls` | Project-scoped call log (cursor). Filter: `?kind=`, `?promptId=`, `?actorId=`, `?sessionId=`, `?traceId=`, `?verdict=under\|on\|over`, `?since=` |
| GET | `/api/ai/estimates/:estimateId` | Estimate row + the resolved `ai_call_log` row (if any) + variance |
| GET | `/api/projects/:id/ai/estimate-accuracy` | Roll-up per `kind` / `promptId` / `model`: avg variance %, p50/p95, count of `over`/`on`/`under` |

**Internal helper contract (`be/src/ai/invoke.ts`):**
```ts
async function invoke_ai(args: InvokeAiArgs): Promise<AiCallResult> {
  const prompt    = load_prompt_template(args);                     // ai_prompts table
  const context   = select_context_for_ai(args.contextScope, args.hint);
  const provider  = pick_provider(args, prompt);
  const result    = await call_provider(provider, prompt, context, args.inputs);
  const callId    = await record_ai_call_log(args, prompt, context, provider, result); // ALWAYS
  return assemble_result(callId, result, context);
}
```

The same function is called by:
- `POST /api/ai/invoke`, `/api/ai/respond`, `/api/ai/cost-estimate` (Section H)
- Event projectors: `ai.respond.request`, `doc.regenerate`, `prototype.generate`, `init.skeleton.suggest`, `capability.narrative.regenerate`
- BullMQ workers under `be/src/jobs/workers/ai-*.worker.ts`

No code path bypasses logging.

## I. AI Prompts (configurable)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ai-prompts` | List |
| GET | `/api/ai-prompts/:id` | Template + variables + version |
| GET | `/api/ai-prompts/:id/versions` | History |
| GET | `/api/ai-prompts/:id/test-runs` | A/B test outcomes |

Mutations: `ai-prompt.*` events.

## J. Jobs

WS is primary; these are sync fallbacks.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/jobs/:id` | Status + step + error + traceId |
| GET | `/api/projects/:id/jobs` | Recent jobs (cursor) |

## K. Versions

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/versions` | Project-level snapshots |
| GET | `/api/features/:id/versions` | Per-feature snapshots |
| GET | `/api/versions/:id` | Snapshot + diff |
| GET | `/api/versions/:id/restore-preview` | Preview restore impact |

Mutations: `version.*` events.

## L. Exports

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/exports/:id` | Signed download URL |
| GET | `/api/share/:token` | Public stateful prototype view |

Mutations: `export.request` event.

## M. Glossary

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/glossary` | Project + user-layered terms |
| GET | `/api/glossary/cross-project-suggestions` | Cross-project vocab suggestions |

Mutations: `glossary.*` events.

## N. Comments

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/comments?entityType=X&entityId=Y` | Polymorphic, threaded |
| GET | `/api/comments/:id` | Single comment (for deep links) |
| GET | `/api/comments/:id/history` | Edit audit trail |
| GET | `/api/comments/:id/reactions` | Reaction roster |

Mutations: `comment.*` events (`add`, `edit`, `resolve`, `unresolve`, `delete`, `reaction.add`, `reaction.remove`, `mark-as-decision`).

## O. Usage / Cost

Roll-ups + raw call log over `ai_call_log` (see [arch/02 slow-query](../architecture/02-multi-db-and-slow-query-logging.md) for storage path).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/usage` | Aggregated AI spend by module/feature/page |
| GET | `/api/usage/calls` | Raw `ai_call_log` rows with filters (`?actorId=`, `?model=`, `?dateRange=`, `?promptId=`, `?kind=`) |

## P. Voice

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/voice/transcribe` | Audio → Whisper → text (streaming). FE then dispatches `message.add`. |

## Q. Uploads

Files bypass the server.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/uploads/sign` | Body: `{ filename, mimeType, size, intendedUse: 'project-document'\|'message-attachment'\|'voice-clip' }`. Returns `{ uploadUrl, storageKey, expiresAt }` |
| GET | `/api/documents/:id/download` | Signed URL for a registered project document |
| GET | `/api/attachments/:storageKey/download` | Signed URL for a message attachment |

## R. WebSocket

Available **from the moment `project.create` commits** (not only post-workspace). Members joining mid-init see live state.

| Path | Purpose |
|------|---------|
| `WS /api/ws?projectId=X` | Project channel — events + job updates + cascade suggestions + workspace presence |
| `WS /api/ws/sessions/:id` | Session channel — typing, AI-thinking, per-session presence (high-frequency, scoped) |
| `WS /api/ws/crdt/:docId` | Yjs update channel per entity (feature doc, block tree) |

## S. Health

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health/live` | Process alive (cheap, no DB) |
| GET | `/api/health/ready` | DB + Redis + storage reachable; 503 with details if any down |

## T. Decision Log

Project-wide append-only ledger of **formal decisions** — distinct from per-session transcripts. Built as a projection from `decision.capture` events across all sessions + manual entries. Surfaces in workspace as a dedicated tab.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/decision-log` | All decisions, newest first. Filters: `?status=active\|superseded\|overridden`, `?proposedBy=`, `?authorityRankAtMost=`, `?featureId=`, `?moduleId=`, `?since=` |
| GET | `/api/decisions/:id` | Single decision: text, proposer, agreers, authority rank, source event/session, supersession chain, related events |
| GET | `/api/decisions/:id/history` | Versions + edits + override events touching this decision |
| GET | `/api/projects/:id/decision-log/export` | BRD-style export of the active decision set (`?format=md\|csv\|pdf`) |
| GET | `/api/decisions/:id/conflicts` | All historical conflict events for this decision (who tried, what happened) |
| GET | `/api/decisions/:id/votes` | Full vote roster: ✅ agreed / ❌ disagreed / ⚪ abstained / ⏳ pending — each with userId, name, authorityRank, votedAt, reason? |
| GET | `/api/decisions/:id/vote-history` | Append-only history of every `decision.vote` event for this decision (who changed their stance and when) |

Mutations: `decision.capture`, `decision.vote`, `decision.vote.invite`, `decision.edit`, `decision.supersede`, `decision.promote-to-fixture`, `decision.conflict.acknowledged`, `decision.conflict.overridden`, `decision.conflict.reverted`, `comment.mark-as-decision`, `authority.override` (when targeting a decision).

**Conflict detection (AI-driven, severity-tiered prompt):** any mutating event that would supersede an active decision triggers either a **synchronous pre-check** (server returns `409 decision-conflict`) or an **async deep-check** (worker calls `invoke_ai({ kind: 'detect-decision-conflicts' })` → emits `decision.conflict.detected` over WS). The `severity` field drives the prompt UX:
- 🟢 `soft` (equal-or-higher actor) — grey toast, no justification required.
- 🟡 `caution` (same rank, broad consensus on original) — amber modal, justification recommended.
- 🔴 `strong` (lower authority overriding higher) — **red blocking modal, justification mandatory, original decider notified at high priority via WS + email + push**.

Full spec, prompt copy, severity matrix, and notification rules: [`flows/decision-log.md` §5](../flows/decision-log.md#5-decision-conflict-detection-ai-driven-prompt-with-severity-tiers).

---

## Open questions

| # | Question |
|---|----------|
| API-1 | Rate limit thresholds per user / per event type / per `ai/invoke` call |
| API-2 | SSE vs. WS for streaming AI responses (Section H supports `stream: true` either way) |
| API-3 | Webhook outbound surface for client integrations (Phase 5+) |
