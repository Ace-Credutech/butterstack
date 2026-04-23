# Flow — Conversations (Possibilities)

The conversation primitive powers project-init clarification, planning chats, per-feature discussions, and meetings. This doc catalogs **what's possible** in a session, not a single linear journey.

Conventions / envelope: see [`api/api-catalog.md`](../api/api-catalog.md). Events: see [`api/events-catalog.md`](../api/events-catalog.md).

---

## 1. Session shape

A session = bounded conversation with `kind ∈ project-init-clarify | planning | feature | meeting`.

- 0..N participants (humans + AI).
- AI is one participant — **never auto-replies**. Invoked only by explicit `ai.respond.request`.
- Multiple sessions can exist per project (per topic, per sitting).
- Sessions can be reopened (`session.reopen`).

## 2. Multi-participant chat

| Possibility | How |
|-------------|-----|
| Several humans typing at once | `presence.typing.start/end`; `message.add` ordered by `sequenceNo` |
| Reply to a specific message (threading) | `message.add { replyToMessageId }` |
| Mention a person | `@<member>` in content; parsed → `mentions.users[]`; ephemeral notification |
| Mention AI | `@ai` shortcut; auto-fires `ai.respond.request { scope: 'thread-from-message'|'last-n: 1' }` |
| Read receipts (optional) | `message.read` |
| Edit / soft-delete own message | `message.edit` / `message.delete` |
| See who's online in this session | `presence.join/leave` on session channel |
| See AI generating | `ai.thinking.start/end` broadcast |

## 3. Asking AI — explicit invocation

> **Two routes, one underlying helper.** Either fire the `ai.respond.request` event (async; reply arrives via WS) **OR** call the synchronous facade `POST /api/ai/respond` (same body; returns reply directly). Both go through `be/src/ai/invoke.ts → invoke_ai()`, both write a row to `ai_call_log`, both emit `ai.call.recorded`. The generic `POST /api/ai/invoke` is the same helper for non-conversational AI calls. See [`api/api-catalog.md` §H](../api/api-catalog.md#h-ai-communication).

`ai.respond.request` payload `scope` options:

| Scope | Meaning |
|-------|---------|
| `all-unanswered` | Default — every user message since last AI reply |
| `last-n` | Last N messages (`scopeArgs.n`) |
| `since-message` | Since a specific `messageId` |
| `specific-messages` | Exact `messageIds[]` |
| `thread-from-message` | A message + all replies under it |

**Hints:** `hint?: string` ("focus on compliance"), `contextHint?: { mustInclude?, exclude? }` to pin/unpin context items manually.

**Dedup:** server collapses requests within 2s window per `(sessionId, scope-hash)` — second requester joins first job's result.

**Cancel:** `ai.respond.cancel { requestId }`.

## 4. Attachments inside conversations

Messages can carry documents, images, audio clips:

```jsonc
"attachments": [
  { "kind": "document"|"image"|"audio", "storageKey", "filename", "mimeType", "size" }
]
```

Upload path:
1. `POST /api/uploads/sign { intendedUse: 'message-attachment', ... }` → presigned PUT URL
2. Browser PUTs file to storage
3. `message.add { attachments: [...] }`

Server-side parser job extracts text/transcript/OCR → feeds the **Context Bag** automatically.

## 5. Smart context selection (Context Bag + Selector)

Stuffing everything into every AI call blows the window. Each session has a **Context Bag** (event-derived projection) containing:

- Project brief
- Documents (Step-2 + message attachments — parsed)
- Roles
- Members (names + authority — small)
- Decisions from prior closed sessions
- Current session messages
- Open quiz questions + answers
- Glossary terms touched in scope
- Module/feature snippets relevant post-Step 6

On each `ai.respond.request`, a Selector picks a **bounded subset** under a token budget (`CONTEXT_BUDGET_TOKENS`). Always-in: brief, roles, last N current-session messages, hint, `mustInclude`. Selected by relevance: doc chunks (RAG), older messages (summarized), prior-session decisions, attachments referenced in scope, glossary touches.

Selection log is queryable: `GET /api/sessions/:id/context-selection-log` — for cost/quality debugging.

This **is** the "Mega Conversation" infrastructure (PRD §4.2 #33). Same machinery for planning, feature, meeting, init-clarify.

## 6. Quiz Mode (typed Q&A overlay)

Same session, same context bag — quiz turns are typed events instead of free chat.

| Capability | Event |
|------------|-------|
| Enter quiz mode (user-initiated) | `quiz.start { mode: 'standalone'|'inline' }` |
| AI offers a quiz mid-chat | `quiz.suggest` → user accepts → `quiz.start` |
| AI asks a structured question | `quiz.question.add` (kinds: `mcq`, `multi-select`, `free-text`, `scale`, `yes-no`) |
| Answer (multi-author allowed) | `quiz.answer.add { answeredBy }` |
| Skip explicitly | `quiz.skip` |
| Exit | `quiz.end` |

**Why typed (not free chat):**
- Answers extract directly into `Decision[]` — no NLP re-parse.
- FE renders proper widgets (radios, checkboxes, sliders).
- Skippable cleanly.
- Progress trackable ("3 of 7 answered").

**Multi-participant quiz:**
- Different members answer different questions.
- Disagreement: UI flags "Akash voted X, Shubhangi voted Y" → AI prompts to resolve.
- Authority-gated questions: payload `requiredAuthorityRank` — only members ≤ that rank may answer.

**Side effects:** every answer auto-fires `decision.capture` + `glossary.term.add` for any new vocab.

## 7. AI reply structured artifacts (sidecar)

`message.add (role: 'ai').payload.artifacts` may carry:

```jsonc
{
  "proposedDecisions":     [...],
  "proposedFeatures":      [...],
  "proposedQuizQuestions": [...],
  "cascadeWarnings":       [...]
}
```

FE renders these as clickable chips. One click = one event ("Save as decision", "Create feature", "Answer these"). Cuts conversation length 30–40%.

## 8. Session lifecycle

| Stage | Event |
|-------|-------|
| Open | `session.start { kind, title? }` |
| Decision capture (during) | `decision.capture` (manual) or extracted on close |
| Close | `session.end { sessionId, summary? }` — triggers Decision-extraction job |
| Reopen | `session.reopen { sessionId }` |

## 9. Cross-session carry-forward

Prior closed sessions of the same `kind` contribute their **decisions only**, not raw transcripts. Keeps prompts bounded; preserves the typed essence. Decisions carry: `proposedBy`, `agreedByUserIds[]`, `proposerAuthorityRank`.

## 10. Cost preflight

Before firing `ai.respond.request`, FE can call:

```
POST /api/ai/cost-estimate
body: { kind: 'respond', scope, hint? }
→ { provider, model, expectedInTokens, expectedOutTokens, expectedCostUsd, contextItemsChosenSummary }
```

UI shows the estimate inline on the "Ask AI" button. Removes surprise-bill anxiety.

## 11. Voice in conversations

Push-to-talk → `POST /api/voice/transcribe` → text → `message.add { channel: 'voice', content: transcript, attachments?: [{ kind: 'audio', ... }] }`. Whisper. EN + Hinglish V1.

## 12. Real-time collaboration

WS channels:

| Channel | Carries |
|---------|---------|
| `WS /api/ws?projectId=X` | All persisted events for the project (incl. messages) |
| `WS /api/ws/sessions/:id` | High-frequency ephemerals (typing, cursor, AI thinking) |

Catch-up after disconnect: `GET /api/projects/:id/events?since=<sequenceNo>`.

## 13. What sessions can later become (post-V1)

- Long-running meetings (`kind: 'meeting'`) accumulating decisions across days.
- Cross-project sessions (research, vendor calls) — needs tenancy work.
- Voice-first sessions with multi-speaker arbitration (deferred per PRD §10.3).
- Collaborative doc editing inside the conversation (CRDT — Phase 4).

## 14. Decision Log integration

Decisions land in the project-wide ledger from multiple in-conversation surfaces. Full spec: [`flows/decision-log.md`](./decision-log.md).

| In-conversation surface | How a decision gets sealed |
|-------------------------|----------------------------|
| Quiz answer | Auto on `quiz.answer.add` — every answer IS a decision |
| Closing a session | AI extracts decisions on `session.end` |
| **AI proactive suggestion** | AI detects a decision-shaped statement mid-chat → emits `decision.suggest` as an inline chip: *"Mark this as a decision?"* — one-click confirm fires `decision.capture` |
| AI artifacts chip | AI's reply carries `proposedDecisions[]`; click to seal |
| `@decision <text>` shortcut | Any participant types it inline → server parses + auto-fires `decision.capture` |
| **Comment → Mark as Decision** | On any comment (any entity), one click fires `comment.mark-as-decision` → `decision.capture` with `sourceCommentId`. Comment stays with a "→ Decision" badge. |

FE renders a Decision Log side-panel during conversations; live updates via WS push (`decision.added-to-log`).

Endpoints + events: see [`flows/decision-log.md`](./decision-log.md).

## 15. Future possibilities (parking lot)

| # | Idea |
|---|------|
| C-1 | Pin specific messages as "always-in context" for the session |
| C-2 | Branch a session — fork transcript at a point to explore an alternative |
| C-3 | Merge two sessions (e.g. dedupe parallel clarifications on the same topic) |
| C-4 | Per-message AI critique — "ask AI to challenge this decision" |
| C-5 | Bot personas — invite an AI participant tuned for compliance / security / UX expert |
| C-6 | Auto-summarize session every N turns (visible inline, stored as projection) |
| C-7 | Outbound webhooks on `decision.capture` — push to Linear / Jira / Slack |
| C-8 | Multi-language live translation between participants |
