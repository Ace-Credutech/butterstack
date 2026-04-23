# Butterstack V2 — Events Catalog

Every mutation is an event. The single write surface is `POST /api/events`. The Bun/Hono `Event` discriminated union is generated from this catalog (or vice versa).

## Envelope (every request to `POST /api/events`)

```jsonc
{
  "type":            "<namespace>.<verb>",
  "payload":         { ... },                // type-specific (below)
  "scope":           {                       // always includes projectId; others as applicable
    "projectId":   "uuid",
    "moduleId":    "uuid?",
    "featureId":   "uuid?",
    "pageId":      "uuid?",
    "sessionId":   "uuid?"
  },
  "source":          "user" | "ai" | "system",
  "idempotencyKey":  "uuid",                 // REQUIRED — dedup window 24h
  "expectedVersion": "int?",                 // optimistic concurrency for entity updates
  "overrideTargetEventId": "uuid?",          // when overriding a gated decision
  "eventVersion":    1                       // event-shape version (default 1)
}
```

## Server response

```jsonc
{
  "id":           "uuid",
  "sequenceNo":   1234,         // monotonic per project — clients order by this
  "appliedAt":    "ISO",
  "stateDelta":   { ... },      // affected entities + minimal new state
  "jobId":        "uuid?",      // when async work was enqueued
  "traceId":      "uuid"        // mirrors X-Trace-Id; flows through logs/jobs/AI calls/WS frames
}
```

## Cross-cutting rules

- **Append-only.** No UPDATE/DELETE on the events table — ever.
- **Tombstones, not hard delete.** `<entity>.delete` flips `deleted_at`. `<entity>.restore` undoes.
- **`source: 'user'` is sacred.** AI projector cannot overwrite user-sourced fields.
- **`authorityRank` stamped at capture**, never re-inferred.
- **`affected_entities`** computed by projector, denormalized for fast impact queries.
- **`scope.projectId`** required on every event.

---

## Namespace: `project`

| Type | Payload | Purpose |
|------|---------|---------|
| `project.create` | `{ name, slug, brief }` | Create project. WS becomes available immediately. |
| `project.update` | `{ name?, brief? }` | Rename/edit meta |
| `project.delete` | `{}` | Soft-delete (tombstone) |
| `project.restore` | `{}` | Undo soft-delete |
| `project.init.step` | `{ step: 1..6, status: 'done'|'stale'|'in-progress' }` | Stepper marker (resumable). Auto-flips `done → stale` when an earlier step is re-edited. |
| `project.init.step.status.changed` | `{ step, status, reason }` | **System-emitted** when a step goes stale. Broadcast only. |
| `project.document.upload` | `{ documentId, filename, mimeType, size, storageKey, kind: 'brd'|'excel'|'mock'|'pdf'|'other' }` | Step-2 register-after-upload (presigned via `POST /api/uploads/sign`) |
| `project.document.delete` | `{ documentId }` | Soft-delete |
| `project.init.skeleton.suggest` | `{ hint?, basedOnRevisionId? }` | Step-6 async AI job. Creates a new `skeleton_revision`. Re-runnable. |
| `project.init.skeleton.node.add` | `{ revisionId, parentNodeId?, name, orderIndex }` | Inline edit on a proposed revision (no AI) |
| `project.init.skeleton.node.edit` | `{ revisionId, nodeId, name?, orderIndex? }` | Inline edit |
| `project.init.skeleton.node.remove` | `{ revisionId, nodeId, cascade: bool }` | Inline edit |
| `project.init.skeleton.confirm` | `{ revisionId }` | Atomically commits `module.create × N` from the chosen revision (server-side) |

## Namespace: `member`

Real humans on the project. Authority is **inline** (no separate ladder).

| Type | Payload | Purpose |
|------|---------|---------|
| `member.add` | `{ name, email, designation, stakeholderRole, authorityRank }` | Add stakeholder. `stakeholderRole ∈ decider|reviewer|contributor|observer`. `authorityRank` int (1=highest). Default project-member capability derived from `stakeholderRole`. |
| `member.update` | `{ memberId, designation?, stakeholderRole?, authorityRank? }` | Edit any inline field |
| `member.remove` | `{ memberId }` | Soft-delete (tombstone). Authority-gated. |
| `member.restore` | `{ memberId }` | |

## Namespace: `role` (system personas inside the app being built)

| Type | Payload | Purpose |
|------|---------|---------|
| `role.create` | `{ name, description? }` | e.g. Admin/Teacher/Student |
| `role.rename` | `{ roleId, name }` | |
| `role.update` | `{ roleId, description }` | |
| `role.delete` | `{ roleId }` | Soft-delete; capability cells follow |
| `role.restore` | `{ roleId }` | |

## Namespace: `module`

| Type | Payload | Purpose |
|------|---------|---------|
| `module.create` | `{ parentId?, name, orderIndex }` | Add module. Usually emitted server-side via `init.skeleton.confirm`. |
| `module.rename` | `{ moduleId, name }` | Cascade trigger |
| `module.move` | `{ moduleId, newParentId, orderIndex }` | Reparent |
| `module.delete` | `{ moduleId }` | Soft-delete a leaf only — 422 if has children |
| `module.delete.recursive` | `{ moduleId }` | Soft-delete subtree. Authority-gated. Emits cascade suggestions. |
| `module.restore` | `{ moduleId }` | |

## Namespace: `feature`

| Type | Payload | Purpose |
|------|---------|---------|
| `feature.create` | `{ moduleId, name }` | |
| `feature.rename` | `{ featureId, name }` | Cascade trigger |
| `feature.move` | `{ featureId, newModuleId }` | |
| `feature.status.set` | `{ featureId, pmStatus }` | |
| `feature.link.page` | `{ featureId, pageId }` | M×N |
| `feature.unlink.page` | `{ featureId, pageId }` | |
| `feature.delete` | `{ featureId }` | Soft-delete |
| `feature.restore` | `{ featureId }` | |
| `feature.raw-input.add` | `{ featureId, type: 'text'|'voice'|'file'|'quiz', content, attachments?: [{ kind, storageKey, filename, mimeType, size }], sourceEventId? }` | Direct user input attached to a feature (not via a session). E.g. PM pastes a paragraph into the feature detail panel, or uploads a spec snippet. Parsed async → feeds Context Bag for feature-scoped AI calls. |
| `feature.raw-input.edit` | `{ rawInputId, content }` | Typo/clarification. Audit trail kept. |
| `feature.raw-input.delete` | `{ rawInputId }` | Soft-delete. |
| `feature.raw-input.promote-to-decision` | `{ rawInputId, decisionTextOverride? }` | Seal a raw input as a formal decision — same pattern as `comment.mark-as-decision`. Server fans out to `decision.capture` with `sourceRawInputId`. |
| `feature.narrative.add` | `{ featureId, content }` | Free-text narrative — unstructured prose captured on the feature. |
| `feature.narrative.edit` | `{ narrativeId, content }` | |
| `feature.narrative.delete` | `{ narrativeId }` | Soft-delete. |

## Namespace: `page`

| Type | Payload | Purpose |
|------|---------|---------|
| `page.create` | `{ name, pageType, layout }` | |
| `page.rename` | `{ pageId, name }` | |
| `page.layout.set` | `{ pageId, layout }` | |
| `page.delete` | `{ pageId }` | Soft-delete |
| `page.restore` | `{ pageId }` | |

## Namespace: `authority`

Authority is captured **inline on `member.add`**. Only override events here. The full event-authority gating registry lives in [`architecture/03-project-lifecycle-and-rbac.md`](../architecture/03-project-lifecycle-and-rbac.md).

| Type | Payload | Purpose |
|------|---------|---------|
| `authority.override` | `{ originalEventId, justification }` | Override a gated decision. Soft-prompt UX before sending. Notifies original decider via WS. |

## Namespace: `capability` (RBAC for the app being built)

| Type | Payload | Purpose |
|------|---------|---------|
| `capability.set` | `{ cellId, allowed }` | Flip a matrix cell |
| `capability.narrative.set` | `{ cellId, narrative, source: 'user' }` | Edit per-cell paragraph. First user-edit flips `source` permanently to `user` (sacred). |
| `capability.narrative.regenerate` | `{ cellId, hint? }` | AI rewrite — only when `source = 'ai'`. Async. |

## Namespace: `session`

A session = bounded conversation. Multi-participant. AI is one participant. See [`flows/conversations.md`](../flows/conversations.md).

| Type | Payload | Purpose |
|------|---------|---------|
| `session.start` | `{ kind: 'project-init-clarify'|'planning'|'feature'|'meeting', title?, featureId? }` | Open a session. Multiple `project-init-clarify` per project allowed. `title` labels topic. |
| `session.end` | `{ sessionId, summary? }` | Close. Triggers Decision-extraction job. |
| `session.reopen` | `{ sessionId }` | Reopen for additional turns. |

## Namespace: `decision` (Decision Log)

The Decision Log is the project-wide append-only ledger of formal decisions. It's a **projection** built from these events. Distinct from session transcripts. See [api/api-catalog.md §T](./api-catalog.md#t-decision-log).

| Type | Payload | Purpose |
|------|---------|---------|
| `decision.capture` | `{ text, sessionId?, featureId?, moduleId?, proposedBy, proposerAuthorityRank, sourceMessageIds?: string[], sourceQuizAnswerIds?: string[], sourceCommentId?: string, sourceRawInputId?: string, initialAgreedByUserIds?: string[] }` | Record a decision. Auto-emitted on `session.end` extraction, `quiz.answer.add`, `comment.mark-as-decision`, `feature.raw-input.promote-to-decision`, or fired manually / via `decision.suggest` confirmation. `initialAgreedByUserIds` is sugar — server fans out to `decision.vote { vote: 'agree' }` per user. |
| `decision.vote` | `{ decisionId, vote: 'agree'|'disagree'|'abstain', reason? }` | Record/update a user's stance. One active vote per `(decisionId, userId)`; re-voting overwrites prior stance. Full history preserved in event log. |
| `decision.vote.invite` | `{ decisionId, userIds: string[] }` | Mark members as expected voters (so they appear in `pending`). Auto-fired for high-authority members on `decision.capture`. |
| `decision.suggest` | `{ scope: 'session'|'comment-thread', sessionId?, commentId?, suggestedText, sourceMessageIds?, sourceCommentIds?, proposedByCandidateUserId, confidence }` | **AI-emitted proactive prompt.** Surfaces inline in chat (as a system message) or attached to a comment thread. One-click confirm fires `decision.capture`; one-click dismiss emits `decision.suggest.dismissed`. AI never auto-seals. |
| `decision.suggest.dismissed` | `{ suggestionId, dismissedBy, reason? }` | User declined an AI decision suggestion. |
| `decision.edit` | `{ decisionId, text? }` | Edit text only. Vote changes go through `decision.vote`. Audit trail kept. |
| `decision.supersede` | `{ decisionId, supersededByDecisionId, reason? }` | Mark a decision superseded by another. Old one stays in log marked `status: 'superseded'`. |
| `decision.promote-to-fixture` | `{ decisionId }` | Phase-2 hook (PRD §3) — promote into formal requirement system. |
| `decision.delete` | `{ decisionId, reason }` | Soft-delete (rare; audit retained). |
| `decision.conflict.acknowledged` | `{ conflictId, dismissedReason? }` | Actor saw the soft-prompt but chose to ignore (no action). |
| `decision.conflict.overridden` | `{ conflictId, originalEventId, justification }` | Sugar — server fans out to `authority.override` + `decision.supersede` atomically. |
| `decision.conflict.reverted` | `{ conflictId, compensatingEvent: { type, payload } }` | After a deep-check finding, undo the triggering change via a compensating event. |

## Namespace: `message`

Multi-author + AI. **AI replies are NOT auto** — require `ai.respond.request`.

| Type | Payload | Purpose |
|------|---------|---------|
| `message.add` | `{ sessionId, role: 'user'|'ai', content, channel: 'text'|'voice', kind: 'text'|'voice'|'quiz-question'|'quiz-answer'|'quiz-suggest'|'system', replyToMessageId?, mentions?: { users: [...], includesAi: bool }, attachments?: [{ kind: 'document'|'image'|'audio', storageKey, filename, mimeType, size }], artifacts?: { proposedDecisions?, proposedFeatures?, proposedQuizQuestions?, cascadeWarnings? } }` | Add a message. `artifacts` only on `role: 'ai'` — clickable chips on FE (one click → one event, cuts conversation length 30–40%). `mentions.includesAi: true` is shorthand for auto-firing `ai.respond.request`. |
| `message.edit` | `{ messageId, content }` | Edit own message; audit trail kept |
| `message.delete` | `{ messageId }` | Soft-delete own message |
| `message.read` | `{ messageId, userId }` | Optional read receipt; broadcast-only |

## Namespace: `ai.respond` / `ai.thinking`

| Type | Payload | Purpose |
|------|---------|---------|
| `ai.respond.request` | `{ sessionId, scope: 'all-unanswered'|'last-n'|'since-message'|'specific-messages'|'thread-from-message', scopeArgs?, hint?, contextHint?: { mustInclude?, exclude? } }` | Explicitly invoke AI. Server dedupes within 2s window per `(sessionId, scope-hash)`. Cost preflight available. |
| `ai.respond.cancel` | `{ requestId }` | Cancel an in-flight AI response |
| `ai.thinking.start` | `{ sessionId, requestId, scopeSummary }` | **System-emitted** broadcast — UI shows "AI is responding to messages from …" |
| `ai.thinking.end` | `{ sessionId, requestId, outcome: 'replied'|'cancelled'|'errored' }` | **System-emitted** |

## Namespace: `quiz`

Typed Q&A overlay on a session. Same session, same context bag — quiz turns are typed events, not free chat.

| Type | Payload | Purpose |
|------|---------|---------|
| `quiz.start` | `{ sessionId, mode: 'standalone'|'inline' }` | Enter quiz mode |
| `quiz.suggest` | `{ sessionId, suggestedQuestions[], reason }` | **AI-emitted** offer; user accepts → `quiz.start` |
| `quiz.question.add` | `{ sessionId, questionId, kind: 'mcq'|'multi-select'|'free-text'|'scale'|'yes-no', question, options?, rationale?, required, contextRefs?, requiredAuthorityRank? }` | AI asks a structured question; rendered as a widget on FE |
| `quiz.answer.add` | `{ questionId, answerValue, answeredBy }` | Multi-author allowed; UI flags disagreements. Auto-fires `decision.capture` + `glossary.term.add`. |
| `quiz.skip` | `{ questionId, skippedBy, reason? }` | Explicit skip; AI sees this in next-turn context |
| `quiz.end` | `{ sessionId, completion: 'done'|'abandoned' }` | Exit quiz mode |

## Namespace: `presence` (ephemeral, broadcast-only)

Not persisted. Backed by Redis.

| Type | Payload | Purpose |
|------|---------|---------|
| `presence.join` | `{ projectId, userId, location: 'workspace'|'session:<id>'|'page:<id>' }` | Auto on WS open |
| `presence.leave` | `{ projectId, userId, location }` | |
| `presence.cursor` | `{ projectId, userId, location, cursor: { x, y, selection? } }` | Throttled client-side (~30Hz) |
| `presence.typing.start` | `{ sessionId, userId }` | |
| `presence.typing.end` | `{ sessionId, userId }` | |

## Namespace: `doc` (StructuredDoc — field-scoped)

| Type | Payload | Purpose |
|------|---------|---------|
| `doc.section.set` | `{ featureId, sectionKey, content, source: 'user'|'ai'|'default' }` | Write one section. `source: 'user'` sacred. |
| `doc.regenerate` | `{ featureId, sectionKey, hint? }` | Field-scoped AI rewrite. Skips user-source. |
| `doc.section.delete` | `{ featureId, sectionKey }` | |

## Namespace: `slot` / `block` (UITokens editing)

| Type | Payload | Purpose |
|------|---------|---------|
| `slot.set` | `{ pageId, path, value, source: 'user' }` | Inline edit from prototype iframe. Auto-fires glossary capture. |
| `block.add` | `{ pageId, kind, afterBlockId? }` | |
| `block.delete` | `{ pageId, blockId }` | |
| `block.reorder` | `{ pageId, newOrder: string[] }` | |
| `block.role-scope.set` | `{ blockId, roles: string[] }` | Restrict by role (stored at capture, not inferred) |

## Namespace: `prototype`

| Type | Payload | Purpose |
|------|---------|---------|
| `prototype.generate` | `{ pageIds: string[], context? }` | Async job. WS publishes `job.step` updates. |
| `prototype.regenerate` | `{ pageId, feedback }` | |
| `prototype.state.snapshot` | `{ pageId, stateBlob }` | Save runtime state seed for shareable links |

## Namespace: `glossary` (4-layer vocabulary)

| Type | Payload | Purpose |
|------|---------|---------|
| `glossary.term.add` | `{ scope: 'user'|'project'|'org'|'platform', scopeId, canonical, userWord, firstSeenEventId? }` | Auto-fired by `slot.set` and `quiz.answer.add` |
| `glossary.term.update` | `{ termId, canonical?, userWord? }` | |
| `glossary.term.delete` | `{ termId }` | Soft-delete |
| `glossary.merge-suggestion.accept` | `{ termId, intoId }` | Cross-project merge |

## Namespace: `version`

| Type | Payload | Purpose |
|------|---------|---------|
| `version.save` | `{ entityType: 'project'|'feature', entityId, label }` | Manual snapshot. Auto-fires on `export.request`. |
| `version.restore` | `{ versionId }` | Authority-gated |
| `version.label.edit` | `{ versionId, label }` | |

## Namespace: `comment`

| Type | Payload | Purpose |
|------|---------|---------|
| `comment.add` | `{ entityType, entityId, content, parentId?, mentions?: { users: string[] }, attachments?: [{ kind, storageKey, filename, mimeType, size }] }` | Polymorphic, threaded. AI scans comment threads → may emit `decision.suggest` ([decision namespace](#namespace-decision-decision-log)). |
| `comment.edit` | `{ commentId, content }` | Edit own comment. Audit trail kept. |
| `comment.resolve` | `{ commentId }` | Close the thread. |
| `comment.unresolve` | `{ commentId }` | Reopen a resolved thread. |
| `comment.delete` | `{ commentId }` | Soft-delete. |
| `comment.reaction.add` | `{ commentId, reaction: '👍'|'❤️'|'🎯'|'⚠️'|'❓' }` | Quick signal (limited emoji set). |
| `comment.reaction.remove` | `{ commentId, reaction }` | |
| `comment.mark-as-decision` | `{ commentId, decisionTextOverride?, initialAgreedByUserIds[]? }` | Seal a comment as a formal decision. Server fans out atomically to `decision.capture` (with `sourceCommentId`). Comment stays visible with a "→ Decision" badge. Authority-gated like any `decision.capture`. |

## Namespace: `export`

| Type | Payload | Purpose |
|------|---------|---------|
| `export.request` | `{ kind: 'brd'|'excel'|'mindmap'|'share-link', entityId }` | Auto-fires `version.save` first |

## Namespace: `ai-prompt`

| Type | Payload | Purpose |
|------|---------|---------|
| `ai-prompt.update` | `{ promptId, template, variables }` | Edit live, versioned |
| `ai-prompt.test-run` | `{ promptId, version, sampleInput }` | A/B test against a stored sample |

## Namespace: `cascade`

| Type | Payload | Purpose |
|------|---------|---------|
| `cascade.suggest` | `{ triggerEventId, suggestions: [{ id, kind, target, preview }] }` | **System-emitted** after a primary mutation |
| `cascade.apply` | `{ suggestionIds: string[] }` | Each becomes its own typed event |
| `cascade.dismiss` | `{ suggestionIds: string[] }` | |

## System-emitted (broadcast/audit only — never POSTed by client)

| Type | Payload | Purpose |
|------|---------|---------|
| `ai.estimate.recorded` | `{ estimateId, kind, promptId?, promptVersion?, provider, model, estimatedInTokens, estimatedOutTokens, estimatedCostUsd, contextItemsSummary, requestedBy, traceId }` | Emitted on every `POST /api/ai/cost-estimate`. Backs `ai_estimate_log`. |
| `ai.call.recorded` | `{ callId, kind, promptId, promptVersion, provider, model, estimateId?, estimatedInTokens?, estimatedOutTokens?, estimatedCostUsd?, inTokens, outTokens, costUsd, durationMs, tokenVariancePct?, costVariancePct?, verdict?: 'under'|'on'|'over', contextItemsChosen: [...], entityRefs[], requestedBy, sessionId?, traceId, error? }` | Emitted on **every** AI call. Backs `ai_call_log` table + `/api/usage` rollups + `/api/projects/:id/ai/calls` reads. No code path bypasses it (single internal `invoke_ai()` helper). When `estimateId` is supplied, variance fields are computed automatically. |
| `decision.added-to-log` | `{ decisionId, status }` | Projector-emitted when a `decision.capture` lands in the Decision Log projection. Drives WS push to FE Decision Log tab. |
| `decision.status.changed` | `{ decisionId, from, to, reason }` | Emitted when a decision becomes superseded/overridden. |
| `decision.conflict.detected` | `{ triggerEventId, actorId, conflicts: [{ conflictId, decisionId, decisionText, proposedBy, proposedAtAuthorityRank, proposedAt, voteSummary: { agreed, disagreed, abstained }, severity: 'soft'|'caution'|'strong', justificationRequired: bool, confidence, suggestedPromptText }] }` | **AI-driven async deep-check** finding. Emitted by `decision-conflict-detector` worker (an `invoke_ai()` call, logged in `ai_call_log`). WS-pushed to the actor's FE → severity-tiered prompt modal. |
| `decision.vote.changed` | `{ decisionId, voteSummary: { agreed, disagreed, abstained, pending } }` | Projection update — drives FE live count refresh on Decision Log entries. |
| `decision.dissent.notification` | `{ decisionId, dissenter, reason? }` | Notify the proposer when someone votes `disagree`. Soft priority. |
| `authority.override.notification` | `{ originalDeciderId, overrideEventId, supersededDecisionId, overrider, justification, priority: 'normal'|'high', severity: 'soft'|'caution'|'strong', alsoNotifyUserIds[]? }` | Notify the original decider when their decision is overridden. **`priority: 'high'` triggers email + push** in addition to WS feed. `alsoNotifyUserIds` carries agreers (caution/strong tiers). |
| `project.init.step.status.changed` | `{ step, status, reason }` | Re-edit of an earlier step flips it stale |
| `cascade.suggest` | (above) | |
| `ai.thinking.start/end` | (above) | |

---

## Grand totals (V2)

- **~107 event types across 22 namespaces**
- All routed through one `POST /api/events` with envelope above.
- Response always carries `sequenceNo` (monotonic per project) — FE orders by it.
- Every AI invocation (regardless of trigger) emits `ai.call.recorded` system event AND writes to `ai_call_log` table. See [api/api-catalog.md §H](./api-catalog.md#h-ai-communication).
