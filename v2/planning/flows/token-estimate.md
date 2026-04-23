# Flow — Token Estimates & Context Scale per AI Call

How big is the context fed into each AI call, and what controls it. Read this when sizing prompts, picking models, or budgeting cost.

Conventions: see [`api/api-catalog.md`](../api/api-catalog.md) cross-cutting block + Section H.
Context Bag + Selector mechanics: [`flows/conversations.md` §5](./conversations.md#5-smart-context-selection-context-bag--selector).
AI cost preflight: `POST /api/ai/cost-estimate` ([api/api-catalog.md §H](../api/api-catalog.md#h-ai-communication)).

---

## 1. The single helper

**Every AI invocation goes through `be/src/ai/invoke.ts → invoke_ai()`** — whether triggered by an event projector (`init.skeleton.suggest`, `ai.respond.request`, `doc.regenerate`, `capability.narrative.regenerate`, `decision-conflict-detector`, etc.) or by a direct call to `POST /api/ai/invoke`. Every call writes a row to `ai_call_log` and emits `ai.call.recorded`. **No path bypasses logging.**

Context is built by the **Context Selector** reading from the per-session **Context Bag** projection. Bounded by `CONTEXT_BUDGET_TOKENS` (default `12000`; per-prompt overrides; raised on 1M-context models like Opus 4.7 1M).

## 2. Token estimates per AI call kind

### During project init

| Trigger | Always-in items | Selected by relevance | Typical total | Notes |
|---------|-----------------|-----------------------|---------------|-------|
| Step 2 — document parser (per upload) | the doc itself | — | varies | Per-doc parser job; if AI summarization used, one row per call in `ai_call_log` |
| Step 4 — `ai.respond.request` per turn | brief (~200t), roles (~200t), last N current-session msgs (~3k), hint, `mustInclude` | doc summaries (~500t × M docs), top-K doc chunks via RAG (~2.5k), prior-session decisions (~50t × N), glossary touches (~500t), attachments referenced in scope (~1k each) | **8–12k** | Stays bounded even with many docs/decisions because Selector trims |
| Step 4 — `quiz.question.add` (AI suggests questions) | brief, roles, current session tail | unanswered topics, decisions from prior sessions | **5–8k** | Smaller — focused output |
| Step 4 — `session.end` → `decision.capture` extraction | full transcript of THIS session | quiz answers in this session | **3–10k** | Per-session, runs once on close |
| Step 6 — `init.skeleton.suggest` | brief, roles, ALL members, ALL doc summaries, ALL decisions across ALL init sessions | top-K doc chunks (RAG over full corpus), glossary | **10–15k** | Largest single call during init; budget may be raised |
| Step 6 — `init.skeleton.suggest` re-run | same + `basedOnRevisionId` summary | diff of refinements since last suggest | **10–15k** | |

### Post-init (workspace operations)

| Trigger | Typical total | Notes |
|---------|---------------|-------|
| `ai.respond.request` in a per-feature session | 6–10k | Scoped tighter to that feature |
| `doc.regenerate` (one section) | 3–6k | Field-scoped; cheapest |
| `capability.narrative.regenerate` | 1–3k | Tiny — one cell |
| `prototype.generate` (per page) | 8–12k | Page tokens + design system |
| `decision-conflict-detector` (deep-check, async) | 2–5k | Trigger event + active decisions only |

## 3. What the Selector trims first under budget pressure

1. Older messages in current session (replaced with running summary)
2. Doc chunks below relevance threshold
3. Glossary terms not touched in scope
4. Prior-session decisions older than N days

## 4. What the Selector never trims

1. Project brief
2. Roles list (small, always cheap)
3. Members list summary (names + authority)
4. Hint and `contextHint.mustInclude`
5. Open quiz questions in the active session

## 5. Context Bag → Selector → invoke flow

```
                        ┌──────────────────────────────┐
                        │       Context Bag            │
                        │   (per session projection)   │
                        ├──────────────────────────────┤
                        │ • Project brief              │
                        │ • Documents (parsed text +   │
                        │   chunks + embeddings)       │
                        │ • Roles                      │
                        │ • Members                    │
                        │ • Decisions (all sessions)   │
                        │ • Current session messages   │
                        │ • Quiz Q&A in this session   │
                        │ • Glossary touches           │
                        │ • Module/feature snippets    │
                        └──────────────┬───────────────┘
                                       │
                          select_context_for_ai(scope, hint, contextHint)
                                       │
                              under CONTEXT_BUDGET_TOKENS
                                       ▼
                        ┌──────────────────────────────┐
                        │     Bounded subset (8–15k)   │
                        └──────────────┬───────────────┘
                                       │
                                  invoke_ai()  ────► provider call
                                       │                    │
                                       └────► ai_call_log ◄─┘
                                              + ai.call.recorded event
```

## 6. APIs related to context & token estimation

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ai/cost-estimate` | Preflight: body `{ kind, scope, hint? }` → `{ provider, model, expectedInTokens, expectedOutTokens, expectedCostUsd, contextItemsChosenSummary }`. No DB write. |
| GET | `/api/sessions/:id/context-bag` | Materialized bag for this session (debug/audit) |
| GET | `/api/sessions/:id/context-selection-log` | Last AI call's chosen vs skipped items + reasons |
| GET | `/api/ai/calls/:callId` | Full record of one AI call: request, response, items chosen, prompt template id+version, tokens, cost, duration |
| GET | `/api/projects/:id/ai/calls` | Project-scoped call log; filter `?kind=`, `?promptId=`, `?actorId=`, `?sessionId=`, `?traceId=`, `?since=` |
| GET | `/api/projects/:id/usage` | Aggregated AI spend by module/feature/page |
| GET | `/api/usage/calls` | Raw `ai_call_log` rows with filters |

## 7. Tunables (env)

| Var | Default | Purpose |
|-----|---------|---------|
| `CONTEXT_BUDGET_TOKENS` | `12000` | Selector cap per call (overridable per prompt) |
| `CONTEXT_BUDGET_TOKENS_<KIND>` | per-kind override | e.g. `CONTEXT_BUDGET_TOKENS_SKELETON_SUGGEST=24000` |
| `RAG_TOP_K` | `5` | How many doc chunks the Selector picks |
| `RAG_MIN_SIMILARITY` | `0.7` | Threshold for chunk inclusion |
| `OLD_SESSION_DECISION_DAYS` | `90` | Decisions older than this dropped first under pressure |
| `MODEL_DEFAULT` | `claude-opus-4-7` | Provider routing default |
| `MODEL_<KIND>` | per-kind override | e.g. `MODEL_QUIZ_QUESTION=claude-haiku-4-5-20251001` (cheap) |

## 8. Auditability

Every `ai_call_log` row carries:
- `kind`, `promptId`, `promptVersion`
- `provider`, `model`
- **Estimate side** (set at preflight time, optional): `estimateId`, `estimatedInTokens`, `estimatedOutTokens`, `estimatedCostUsd`, `estimatedAt`
- **Actual side** (set after provider response): `inTokens`, `outTokens`, `costUsd`, `durationMs`
- **Variance** (computed): `tokenVariancePct`, `costVariancePct`, `verdict: 'under'|'on'|'over'` (e.g. `±10%` = `'on'`)
- `contextItemsChosen` (full list with reasons)
- `entityRefs` (which projects/modules/features/pages)
- `requestedBy`, `sessionId?`, `traceId`, `error?`

Plus the system event `ai.call.recorded` mirrors this for downstream projections (usage rollups, audit feed).

## 9. Estimate vs Actual reconciliation

Every `POST /api/ai/cost-estimate` returns `{ estimateId, ... }`. When the actual call lands (via `/api/ai/invoke`, `/api/ai/respond`, or any event-projector path), the FE/projector passes the same `estimateId` in the invoke args. Server links the rows and computes the variance.

### Why we track it

- See if estimates are systematically off (we can re-tune the estimator).
- Per-prompt accuracy metric — flag prompts whose estimates drift >25%.
- Per-model variance — some providers under/over-report tokens.
- Trust signal for the "expected cost" UI chip.

### New endpoint

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ai/estimates/:estimateId` | Estimate row + the actual `ai_call_log` row it resolved to (if any) + variance |
| GET | `/api/projects/:id/ai/estimate-accuracy` | Roll-up per `kind` / `promptId` / `model`: avg variance %, p50/p95, count of `over`/`on`/`under` |

### New table

```sql
ai_estimate_log (
  id                    uuid PK,           -- = estimateId
  kind                  text NOT NULL,
  prompt_id             uuid?,
  prompt_version        int?,
  provider              text NOT NULL,
  model                 text NOT NULL,
  estimated_in_tokens   int NOT NULL,
  estimated_out_tokens  int NOT NULL,
  estimated_cost_usd    numeric NOT NULL,
  context_items_summary jsonb,
  requested_by          uuid NOT NULL,
  scope                 jsonb,
  trace_id              uuid NOT NULL,
  resolved_call_id      uuid?,             -- FK to ai_call_log when matched
  resolved_at           timestamptz?,
  created_at            timestamptz NOT NULL DEFAULT now()
)
```

### New events

| Event | Payload | Purpose |
|-------|---------|---------|
| `ai.estimate.recorded` | `{ estimateId, kind, provider, model, estimatedInTokens, estimatedOutTokens, estimatedCostUsd, requestedBy, traceId }` | System-emitted on every cost-estimate call |
| `ai.call.recorded` (extended) | now includes `estimateId?, estimatedInTokens?, estimatedOutTokens?, estimatedCostUsd?, tokenVariancePct, costVariancePct, verdict` when an estimate was linked | Variance shipped on the same row used for usage rollups |

### Verdict thresholds (configurable)

| Verdict | Variance band |
|---------|---------------|
| `under` | actual < estimated by >10% |
| `on` | within ±10% |
| `over` | actual > estimated by >10% |

Tunable via `ESTIMATE_ACCURACY_BAND_PCT=10`.

## 10. Open questions

| # | Question |
|---|----------|
| T-1 | Per-tenant cost cap with hard cutoff vs soft warning? |
| T-2 | Caching policy for repeated identical Selector outputs (same context bag + same scope) — provider-side cache hit vs our side? |
| T-3 | Streaming vs full responses for `respond` kind — affects token counting accuracy |
| T-4 | Auto-tune the estimator from accumulated variance data — at what cadence? |
