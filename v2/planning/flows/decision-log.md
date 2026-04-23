# Flow — Decision Log

The project-wide append-only ledger of formal decisions. Distinct from session transcripts. Aggregates `decision.capture` events from every source into one timeline + surfaces the AI-driven **conflict-detection soft-prompt** when a lower-authority actor tries to change a higher-authority decision.

Conventions: see [`api/api-catalog.md`](../api/api-catalog.md) cross-cutting block.
Events: see [`api/events-catalog.md` `decision.*` namespace](../api/events-catalog.md).

---

## 1. Sources of decisions (auto-emit `decision.capture`)

The Decision Log aggregates from **every session kind** (`project-init-clarify`, `planning`, `feature`, `meeting`) — not just init. Any conversation, anywhere in the project lifecycle, can contribute decisions.

### From conversations (any session, any time)

| Source | When | Notes |
|--------|------|-------|
| `session.end` extraction | On close of ANY session (init clarify, planning, feature, meeting). AI parses the transcript and emits one `decision.capture` per extracted decision. | Each decision is tagged with `sessionId`, `proposedBy`, `agreedByUserIds[]` (inferred from explicit assents in transcript), `proposerAuthorityRank`. |
| `quiz.answer.add` (mid-session) | Each typed quiz answer IS a decision — auto-fires `decision.capture` immediately, not waiting for `session.end`. | Carries `sourceQuizAnswerIds`. |
| **`decision.suggest` (AI proactive in-chat prompt)** | AI detects a decision-shaped statement mid-conversation (e.g. "let's go with OTP only") and emits `decision.suggest` as a system message in the session. Participants see an inline chip: *"Mark this as a decision?"* | One click → fires `decision.capture` with `sourceMessageIds: [<the message AI flagged>]`, `proposedBy: <author of that message>`. AI never auto-seals — always requires confirmation. |
| AI artifacts chip ("Save as decision") | Any participant clicks a `proposedDecisions` chip on an AI message. | Carries `sourceMessageIds: [aiMessageId]`. |
| In-conversation `@decision` shortcut | Any participant types `@decision <text>` in a message → server parses and auto-fires `decision.capture`. | Inline manual capture without leaving chat. |
| `decision-conflict-detector` | When a deep-check finds a conversation message contradicting an active decision — the user's resolution path leads to a new `decision.capture`. | See §5. |

### From workspace mutations (post-init, ongoing)

| Source | When |
|--------|------|
| `init.skeleton.confirm` | Server emits `decision.capture` for module-level structural choices |
| `slot.set` / `doc.section.set` (when value contradicts an active decision) | Implicit decision change — surfaced via conflict-detection (§5) |
| `version.save` | Optional — major version saves can auto-capture a "checkpoint" decision |
| Manual (any UI surface) | `POST /api/events { type: 'decision.capture', payload: { ... } }` directly |

### From comments (polymorphic — any entity, anywhere in the workspace)

Users can comment on any entity (feature, page, module, doc section, prototype element, capability cell, even another decision). Any comment can be **sealed as a decision** with one action.

| Source | When | Notes |
|--------|------|-------|
| **`comment.mark-as-decision`** | User clicks "Mark as Decision" on any comment. Server emits `decision.capture` with `sourceCommentId: <id>`, `proposedBy: <comment author>`, scope inherited from the commented entity (`featureId` / `moduleId` / `pageId` / `sessionId`). | Subject to the same authority gating as any other `decision.capture`. AI may suggest this proactively via `decision.suggest` on long-running comment threads. |
| AI suggestion on a comment thread | AI detects a comment thread converged on an outcome → emits `decision.suggest` referencing the comment. | One-click chip on the comment to seal it. |

### Cross-session model

A decision is **scoped to its source session** but **visible project-wide**. The Decision Log is the project's flat timeline; filters narrow by `sessionId`, `featureId`, `moduleId`, etc.

When a decision from one session contradicts another from a different session, the conflict-detection layer (§5) catches it and prompts — the source `sessionId` is shown in the soft-prompt so the actor knows where the original came from.

## 2. Entry shape

```jsonc
{
  "id":                    "uuid",
  "projectId":             "uuid",
  "text":                  "Login uses email only, no username",
  "proposedBy":            { "userId" | "ai", "name", "designation" },
  "proposerAuthorityRank": 1,
  "votes": {                                       // projected from append-only decision.vote events
    "agreed":     [{ "userId", "name", "authorityRank", "votedAt", "reason?" }],
    "disagreed":  [{ "userId", "name", "authorityRank", "votedAt", "reason?" }],
    "abstained":  [{ "userId", "name", "authorityRank", "votedAt", "reason?" }],
    "pending":    [{ "userId", "name", "authorityRank" }]   // members invited but haven't voted
  },
  "sourceMessageIds":      [...],
  "sourceQuizAnswerIds":   [...],
  "sourceCommentId":       "uuid?",
  "sessionId":             "uuid?",
  "featureId":             "uuid?",
  "moduleId":              "uuid?",
  "status":                "active" | "superseded" | "overridden",
  "supersededByDecisionId": "uuid?",
  "createdAt":             "ISO",
  "updatedAt":             "ISO"
}
```

### Vote tracking

Votes are append-only events (`decision.vote`). The projection rolls them up into the `votes` object above. Each user has at most one **active** vote per decision; re-voting overwrites their prior stance but the full history is preserved in the event log.

A user can **change their vote** (`agreed → disagreed`, etc.) — every change is an event with timestamp + optional reason. The Decision Log timeline shows the audit trail per decision: *"Akash voted Agree on Apr 23, changed to Disagree on Apr 24 — reason: 'Compliance review flagged it'."*

The FE renders three columns in the Decision detail view: ✅ Agreed · ❌ Disagreed · ⚪ Abstained · ⏳ Pending. Counts visible in the timeline.

---

## 3. APIs

### Reads

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 1 | GET | `/api/projects/:id/decision-log` | Timeline. Filters: `?status=active\|superseded\|overridden`, `?proposedBy=`, `?authorityRankAtMost=`, `?featureId=`, `?moduleId=`, `?sessionId=`, `?since=` (cursor). |
| 2 | GET | `/api/decisions/:id` | Single decision: text + proposer + agreers + authority + source events + supersession chain |
| 3 | GET | `/api/decisions/:id/history` | All `decision.edit` / `decision.supersede` / `authority.override` events touching this decision |
| 4 | GET | `/api/decisions/:id/conflicts` | All conflict events for this decision (who tried to change it, what happened) |
| 5 | GET | `/api/projects/:id/decision-log/export` | BRD-style export of active decisions. `?format=md\|csv\|pdf` |

### Mutations (single write surface — `POST /api/events`)

| # | Event type | Payload | When |
|---|------------|---------|------|
| 6 | `decision.capture` | `{ text, sessionId?, featureId?, moduleId?, proposedBy, proposerAuthorityRank, sourceMessageIds?, sourceQuizAnswerIds?, sourceCommentId?, initialAgreedByUserIds[]? }` | Add a new decision to the log. `initialAgreedByUserIds` is sugar — server fans out one `decision.vote { vote: 'agree' }` per user. |
| 6a | `comment.mark-as-decision` | `{ commentId, decisionTextOverride?, initialAgreedByUserIds[]? }` | Seal a comment as a decision. Server fans out to `decision.capture` (with `sourceCommentId`) atomically. Comment stays; gets a "→ Decision" badge. |
| 6b | `decision.vote` | `{ decisionId, vote: 'agree'|'disagree'|'abstain', reason? }` | Record/update a user's stance. One active vote per `(decisionId, userId)`. Re-voting overwrites prior stance; full history preserved. |
| 6c | `decision.vote.invite` | `{ decisionId, userIds[] }` | Mark members as expected voters (so they show up in `pending`). Auto-fired for high-authority members on `decision.capture`. |
| 7 | `decision.edit` | `{ decisionId, text?, agreedByUserIds? }` | Edit text or add agreers; audit kept |
| 8 | `decision.supersede` | `{ decisionId, supersededByDecisionId, reason? }` | Mark a decision superseded by a newer one |
| 9 | `decision.promote-to-fixture` | `{ decisionId }` | Phase-2 hook (PRD §3) — formalize into requirement system |
| 10 | `decision.delete` | `{ decisionId, reason }` | Soft-delete (rare; audit retained) |
| 11 | `decision.conflict.acknowledged` | `{ conflictId, dismissedReason? }` | User saw the conflict prompt and dismissed without acting |
| 12 | `decision.conflict.overridden` | `{ conflictId, originalEventId, justification }` | Sugar — server fans out to `authority.override` + `decision.supersede` atomically |
| 13 | `decision.conflict.reverted` | `{ conflictId, compensatingEvent: { type, payload } }` | After deep-check, undo the triggering change via a compensating event |
| 14 | `authority.override` | `{ originalEventId, justification }` | When targeting a `decision.capture` event — records the override |

### System-emitted (broadcast over WS — never POSTed by client)

| # | Event type | Purpose |
|---|------------|---------|
| 15 | `decision.added-to-log` | Projector-emitted after `decision.capture` lands; drives FE Decision Log live update |
| 16 | `decision.status.changed` | Emitted when a decision flips `active → superseded\|overridden` |
| 17 | `decision.conflict.detected` | **AI-driven async deep-check finding** — see §5 |
| 18 | `authority.override.notification` | Notify the original decider that their decision was overridden |
| 19 | `decision.suggest` | **AI proactive in-chat / on-comment prompt** — emitted as a system message inside a session OR attached to a comment thread, asking participants to seal a statement as a decision. One-click confirmation fires `decision.capture`. AI never auto-seals. |
| 20 | `decision.vote.changed` | Emitted when the projected vote tally for a decision changes (someone added/changed a vote). Drives FE live update of the ✅ ❌ ⚪ ⏳ counts. |
| 21 | `decision.dissent.notification` | Notify the decision proposer when someone votes `disagree`. Soft-priority; lands in the proposer's notification feed. |

---

## 4. FE surface

- **Workspace tab** — full timeline, filters, search.
- **Init side-panel** — shows decisions captured so far during stepper (Steps 4 + 6); live updates via WS (`decision.added-to-log`).
- **Per-feature panel** — filtered to `featureId` for context inside the feature view.
- **Notification feed** — `authority.override.notification` lands here for the original decider.

---

## 5. Decision Conflict Detection (AI-driven prompt with severity tiers)

When a user edits, says, or quiz-answers something that would contradict an active decision, the system surfaces a prompt. **Severity is determined by the actor's authority relative to the original decider.**

### Two layers (detection)

| Layer | When | How | Cost |
|-------|------|-----|------|
| **Pre-check (synchronous)** | Inside event handler, before commit | Cheap rule-based match: same `featureId`/`pageId`/`field` as an active decision's `entityRefs`, OR the new value contradicts a stored canonical answer. | Microseconds. No AI call. |
| **Deep-check (asynchronous)** | After event commits, via `decision-conflict-detector` worker | Calls `invoke_ai({ kind: 'detect-decision-conflicts', inputs: { triggerEvent, activeDecisions, currentActor } })`. Catches semantic contradictions the rule layer misses. | One AI call (logged in `ai_call_log`). |

### Severity tiers (the prompt UX)

| Tier | When | Prompt color | Blocking? | Justification required? | Notification |
|------|------|--------------|-----------|------------------------|--------------|
| 🟢 **Soft confirm** | `currentActor.authorityRank ≤ original.proposerAuthorityRank` (equal or higher authority overriding) | Grey toast | No | Optional | Original decider notified at normal priority |
| 🟡 **Caution** | Same authority rank, but original had broad consensus (>50% agreed) | Amber modal | No | Recommended | Original decider + agreers notified |
| 🔴 **Strong override** | `currentActor.authorityRank > original.proposerAuthorityRank` (lower authority overriding higher) | **Red blocking modal** | **Yes** | **Required** | **Original decider notified at HIGH priority + email/push** |

### Prompt copy (lower authority overriding higher — 🔴 tier)

> ⚠️ **You are about to override a decision made by a higher authority.**
>
> *"Login uses email only, no username"*
>
> **Decided by Rajneesh (VP, authority rank 1) on 17 April 2026.**
> Agreed by 3 others (Priya, Shubhangi, Anil). Disagreed by 0.
>
> If you proceed, Rajneesh will be **notified immediately** of this override.
>
> [Cancel]    [Modify my change]    **[Proceed — provide justification]**

The justification field is mandatory and gets stored on `authority.override.justification`. It appears verbatim in Rajneesh's notification.

### Prompt copy (equal or higher authority — 🟢 / 🟡 tier)

> 💬 **You're changing a prior decision.**
>
> *"Login uses email only, no username"* — decided by Akash (BA) on 17 April 2026.
>
> Agreed by 2. Want to update it?
>
> [Cancel]    [Modify]    [Confirm change]

No mandatory justification. Original decider gets a normal-priority notification.

### Pre-check API flow

| # | Direction | Call / response | Purpose |
|---|-----------|-----------------|---------|
| 1 | client → server | `POST /api/events { slot.set | doc.section.set | capability.set | quiz.answer.add | ... }` | Actor's normal mutation |
| 2 | server → client | `409 decision-conflict` body: `{ error: { code: 'decision.conflict', details: { conflictingDecisionId, decisionText, proposedBy, proposedAtAuthorityRank, proposedAt, sourceSessionId?, voteSummary: { agreed, disagreed, abstained }, severity: 'soft'|'caution'|'strong', justificationRequired: bool, suggestedPromptText }, traceId } }` | Pre-check hit. `severity` drives the prompt color/blocking behavior; `voteSummary` populates the prompt body. |
| 3 | client UI | Soft-prompt modal — three actions | |
| 3a | **Override** → client → server | `POST /api/events { type: 'decision.conflict.overridden', payload: { conflictId, originalEventId, justification } }` | Server fans out to `authority.override` + `decision.supersede` + the original mutation, all in one transaction. **`justification` is required when severity = 'strong'** (lower overriding higher); server returns 422 if missing. |
| 3b | **Modify** → client → server | New `POST /api/events` with the modified payload | Normal flow |
| 3c | **Cancel** → client → (nothing) | No event | Done |

### Deep-check API flow

| # | Direction | Call / event | Purpose |
|---|-----------|--------------|---------|
| 1 | client → server | `POST /api/events { ... }` | Actor's mutation; commits normally (pre-check missed) |
| 2 | server (background) | `decision-conflict-detector` worker enqueues; calls `invoke_ai`; logs to `ai_call_log` | |
| 3 | server → client (WS) | Broadcast `decision.conflict.detected` payload (see [events-catalog.md](../api/events-catalog.md)) | UI shows soft-prompt |
| 4a | **Override** → client → server | `POST /api/events { type: 'decision.conflict.overridden', payload: { conflictId, originalEventId, justification } }` | Same as pre-check 3a |
| 4b | **Cancel** → client → server | `POST /api/events { type: 'decision.conflict.reverted', payload: { conflictId, compensatingEvent: { type, payload } } }` | Server fires the compensating event (e.g. `slot.set` back to prior value); change is undone |
| 4c | **Acknowledge (no-op)** → client → server | `POST /api/events { type: 'decision.conflict.acknowledged', payload: { conflictId, dismissedReason? } }` | Logged, no state change |

### Notification side-effect (severity-tiered)

When `authority.override` commits against a decision, system emits `authority.override.notification` with a `priority` field. Delivery channels depend on tier:

| Tier | `priority` | Channels |
|------|-----------|----------|
| 🟢 soft | `normal` | WS push to original decider's notification feed |
| 🟡 caution | `normal` | WS push to original decider + all agreers |
| 🔴 strong | `high` | **WS push (top-of-feed banner) + email + push notification** to original decider; also notifies all agreers at normal priority |

Payload includes the override `justification` verbatim so the original decider sees *why* their decision was changed without leaving the notification.

### AI never auto-overrides

`authority.override` always requires explicit user action. AI only **detects and proposes**. Strong-tier overrides require explicit typed justification — no one-click bypass.

---

## 6. End-to-end example

> Akash (BA, authorityRank 3) edits a slot on the Login page changing "Email" → "Email or Username".
> Rajneesh (VP, authorityRank 1) had decided on April 17 in a meeting that login uses email only.

| # | Direction | Call / event |
|---|-----------|--------------|
| 1 | Akash's FE → server | `POST /api/events { type: 'slot.set', payload: { pageId, path: 'blocks[0].fields[0].label', value: 'Email or Username', source: 'user' } }` |
| 2 | server pre-check | finds `conflictingDecisionId` with `proposerAuthorityRank: 1` (Rajneesh). Akash is rank 3. |
| 3 | server → Akash | `409 decision-conflict` with details + `suggestedPromptText: "Rajneesh had decided this on 17 April. Do you want to change it?"` |
| 4 | Akash's FE | shows soft-prompt modal |
| 5a | Akash clicks **Override** + types reason "Compliance change requested by client" | |
| 6 | Akash's FE → server | `POST /api/events { type: 'decision.conflict.overridden', payload: { conflictId, originalEventId, justification: 'Compliance change requested by client' } }` |
| 7 | server transaction | fans out to (`authority.override` + `decision.supersede` + `slot.set` + new `decision.capture` for the new policy) — one atomic commit |
| 8 | server → all WS clients | broadcasts the four events with same `traceId` |
| 9 | server → Rajneesh's WS | `authority.override.notification` — appears in his feed: *"Akash overrode your decision 'Login uses email only' on Apr 23 — reason: 'Compliance change requested by client'"* |
| 10 | Decision Log | timeline now shows the old decision with `status: 'superseded'`, the new one as `active`, with full audit chain |

---

## 7. Open questions

| # | Question |
|---|----------|
| D-1 | Confidence threshold for deep-check `decision.conflict.detected` — what `confidence` value triggers the modal vs a softer toast? |
| D-2 | Conflict prompt cool-down per `(actor, decision)` — if Akash dismisses the same prompt thrice in a session, suppress for the rest of the session? |
| D-3 | Bulk override — when one change conflicts with multiple decisions, single justification or per-decision? |
| D-4 | Should `decision.conflict.reverted` keep the original event in the log (with annotation) or tombstone it? Recommendation: keep + annotate (event log is append-only). |
