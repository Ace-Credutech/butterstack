# Flow — Workspace (Init + Action Points)

What loads when a user enters the workspace, and every action they can take from there. Each action lists its API calls in order.

---

## A. Workspace boot (on enter)

1. `GET /api/projects/:id/init` — **one-shot hydration**. Returns everything the workspace needs in a single round-trip:
   - project meta
   - roles + members
   - module tree
   - recent sessions
   - active jobs
   - glossary summary
   - **stepper status** (per-step `done`/`stale`/`in-progress` + skeleton revisions)
   - **recent active decisions** (top N) for the side-panel
   - **capability matrix summary** (counts; full matrix loads lazily on RBAC tab)
   - `lastSequenceNo`
2. `WS /api/ws?projectId=:id` — open if not already open; reconnect catch-up via `?since=<lastSequenceNo>`

That's it for boot. Tab-specific deep-loads happen on-demand when the user opens that tab (lazy):
- RBAC tab → `GET /api/projects/:id/capability-matrix?withNarratives=true`
- Decision Log tab → `GET /api/projects/:id/decision-log?status=...` with filters
- Jobs panel → `GET /api/projects/:id/jobs` (full list; boot only carried active count)
- Glossary tab → `GET /api/projects/:id/glossary`
- Audit tab → `GET /api/projects/:id/audit-feed`
- Usage tab → `GET /api/projects/:id/usage`

---

## Action points

### B. Tree manipulation (modules / features / pages)

7. `POST /api/events` — `module.create` / `module.rename` / `module.move` / `module.delete` / `module.delete.recursive` / `module.restore`
8. `POST /api/events` — `feature.create` / `feature.rename` / `feature.move` / `feature.status.set` / `feature.link.page` / `feature.unlink.page` / `feature.delete` / `feature.restore`
9. `POST /api/events` — `page.create` / `page.rename` / `page.layout.set` / `page.delete` / `page.restore`
10. `GET /api/projects/:id/modules` — refresh tree
11. `GET /api/modules/:id` / `GET /api/features/:id` / `GET /api/pages/:id` — open node detail

### C. Open a feature (center panel)

12. `GET /api/features/:id` — feature + linked pages
13. `GET /api/features/:id/raw-inputs`
14. `GET /api/features/:id/tokens`
15. `GET /api/features/:id/narratives`
16. `GET /api/features/:id/doc`

### C1. Feature raw inputs & narratives (direct edits at feature level)

When a user pastes a paragraph / uploads a spec / writes a narrative directly on the feature detail panel (not via a conversation):

- `POST /api/events` — `feature.raw-input.add { featureId, type, content, attachments? }` *(via `POST /api/uploads/sign` first if attaching)*
- `POST /api/events` — `feature.raw-input.edit { rawInputId, content }`
- `POST /api/events` — `feature.raw-input.delete { rawInputId }`
- `POST /api/events` — `feature.raw-input.promote-to-decision { rawInputId, decisionTextOverride? }` *(seal as decision)*
- `POST /api/events` — `feature.narrative.add | feature.narrative.edit | feature.narrative.delete`
- `GET /api/raw-inputs/:id` / `GET /api/narratives/:id` *(single item with history)*
- `GET /api/features/:id/raw-inputs` / `GET /api/features/:id/narratives` *(refresh after mutation)*

### D. StructuredDoc editing

17. `POST /api/events` — `doc.section.set`
18. `POST /api/events` — `doc.regenerate` (field-scoped AI rewrite, async job)
19. `POST /api/events` — `doc.section.delete`

### E. Prototype generation & inline edits

20. `POST /api/ai/cost-estimate` *(optional preflight)*
21. `POST /api/events` — `prototype.generate { pageIds[] }`
22. `GET /api/jobs/:id` *(or WS push)* — wait
23. `GET /api/prototypes/:pageId` — load latest stateful HTML + state seed
24. `POST /api/events` — `slot.set` (inline label/field edit from iframe)
25. `POST /api/events` — `block.add` / `block.delete` / `block.reorder` / `block.role-scope.set`
26. `POST /api/events` — `prototype.regenerate { pageId, feedback }`
27. `POST /api/events` — `prototype.state.snapshot` (save runtime state for share link)
28. `GET /api/prototypes/:pageId/versions`

### F. Conversations (planning / per-feature / meeting)

29. `GET /api/projects/:id/sessions?kind=planning|feature|meeting`
30. `POST /api/events` — `session.start { kind, featureId?, title? }`
31. `WS /api/ws/sessions/:id` — open
32. `POST /api/voice/transcribe` *(if voice)*
33. `POST /api/uploads/sign` *(if attachment)*
34. `POST /api/events` — `message.add`
35. `POST /api/ai/cost-estimate` *(optional preflight)*
36. `POST /api/events` — `ai.respond.request` *(or `POST /api/ai/respond` sync)*
37. `POST /api/events` — `quiz.start` / `quiz.answer.add` / `quiz.skip` / `quiz.end`
38. `POST /api/events` — `message.edit` / `message.delete` / `message.read`
39. `POST /api/events` — `session.end` / `session.reopen`
40. `GET /api/sessions/:id/messages` / `decisions` / `attachments` / `quiz-questions` / `context-bag` / `context-selection-log`

### G. Decision Log

41. `GET /api/projects/:id/decision-log?status=&proposedBy=&authorityRankAtMost=&featureId=&moduleId=&since=`
42. `GET /api/decisions/:id` / `/history` / `/votes` / `/vote-history` / `/conflicts`
43. `POST /api/events` — `decision.capture`
44. `POST /api/events` — `decision.vote { agree|disagree|abstain, reason? }`
45. `POST /api/events` — `decision.vote.invite`
46. `POST /api/events` — `decision.edit`
47. `POST /api/events` — `decision.supersede`
48. `POST /api/events` — `decision.promote-to-fixture`
49. `POST /api/events` — `decision.suggest.dismissed` *(when dismissing AI prompt)*
50. On 409 `decision.conflict`: `POST /api/events` — `decision.conflict.overridden` (mandatory `justification` for 🔴 strong tier) / `decision.conflict.acknowledged` / `decision.conflict.reverted`
51. `GET /api/projects/:id/decision-log/export?format=md|csv|pdf`

### H. RBAC / Capability matrix

52. `GET /api/projects/:id/capability-matrix?withNarratives=true`
53. `GET /api/capability-cells/:id`
54. `POST /api/events` — `capability.set`
55. `POST /api/events` — `capability.narrative.set`
56. `POST /api/events` — `capability.narrative.regenerate` *(async AI)*

### I. Roles & Members

57. `POST /api/events` — `role.create` / `role.rename` / `role.update` / `role.delete` / `role.restore`
58. `POST /api/events` — `member.add` / `member.update` / `member.remove` / `member.restore`
59. `GET /api/projects/:id/roles` / `/members`

### J. Comments (polymorphic, on any entity)

60. `GET /api/comments?entityType=&entityId=`
61. `GET /api/comments/:id` / `GET /api/comments/:id/history` / `GET /api/comments/:id/reactions`
62. `POST /api/events` — `comment.add { entityType, entityId, content, parentId?, mentions?, attachments? }`
63. `POST /api/events` — `comment.edit { commentId, content }`
64. `POST /api/events` — `comment.resolve` / `comment.unresolve` / `comment.delete`
65. `POST /api/events` — `comment.reaction.add` / `comment.reaction.remove`
66. `POST /api/events` — `comment.mark-as-decision` *(seal as decision)*

### K. Glossary

64. `GET /api/projects/:id/glossary`
65. `GET /api/glossary/cross-project-suggestions`
66. `POST /api/events` — `glossary.term.add` / `term.update` / `term.delete`
67. `POST /api/events` — `glossary.merge-suggestion.accept`

### L. Versions

68. `GET /api/projects/:id/versions` / `GET /api/features/:id/versions`
69. `GET /api/versions/:id` / `/restore-preview`
70. `POST /api/events` — `version.save`
71. `POST /api/events` — `version.restore`
72. `POST /api/events` — `version.label.edit`

### M. Exports

73. `POST /api/events` — `export.request { kind: 'brd'|'excel'|'mindmap'|'share-link', entityId }`
74. `GET /api/jobs/:id`
75. `GET /api/exports/:id` — signed download URL
76. `GET /api/share/:token` — public stateful prototype link

### N. Cascade suggestions (system-emitted; user acts)

77. *(WS push)* `cascade.suggest`
78. `POST /api/events` — `cascade.apply { suggestionIds[] }` / `cascade.dismiss`

### O. Authority override (independent of conflict flow)

79. `POST /api/events` — `authority.override { originalEventId, justification }`
80. *(WS push)* `authority.override.notification` to original decider

### P. AI Prompts (admin)

81. `GET /api/ai-prompts` / `:id` / `:id/versions` / `:id/test-runs`
82. `POST /api/events` — `ai-prompt.update`
83. `POST /api/events` — `ai-prompt.test-run`

### Q. AI Communication (direct, non-conversational)

84. `POST /api/ai/cost-estimate` — preflight (returns `estimateId`)
85. `POST /api/ai/invoke { kind, inputs, contextScope?, hint?, estimateId? }` — generic call
86. `POST /api/ai/respond` — conversational sugar
87. `GET /api/ai/calls/:callId` — single call detail (incl. estimate-vs-actual variance)
88. `GET /api/projects/:id/ai/calls?kind=&promptId=&actorId=&sessionId=&verdict=&since=`
89. `GET /api/ai/estimates/:estimateId`
90. `GET /api/projects/:id/ai/estimate-accuracy`

### R. Usage / Cost dashboard

91. `GET /api/projects/:id/usage` — aggregated AI spend by module/feature/page
92. `GET /api/usage/calls?actorId=&model=&dateRange=&promptId=&kind=`

### S. Audit feed

93. `GET /api/projects/:id/audit-feed?actorId=&entityType=&entityId=&traceId=&since=`
94. `GET /api/projects/:id/events?type=&actorId=&since=` — raw event log
95. `GET /api/events/:id` — single event + affected entities

### T. Re-enter Phase A stepper (pre-skeleton phases stay re-enterable)

96. Re-do anything from Steps 2–5 of [`create-project.md`](./create-project.md); `init-state` flips that step to `stale`
97. `POST /api/events` — `project.init.skeleton.suggest { basedOnRevisionId? }` — re-suggest skeleton
98. `POST /api/events` — `project.init.skeleton.confirm` — atomic re-commit (additive only on confirmed tree)

### U. Project meta

99. `POST /api/events` — `project.update { name?, brief? }`
100. `POST /api/events` — `project.delete` / `project.restore`

### V. Notifications & presence

101. *(WS push)* `presence.join` / `leave` / `cursor` / `typing.start|end`
102. *(WS push)* `decision.added-to-log` / `decision.vote.changed` / `decision.dissent.notification` / `decision.suggest`
103. *(WS push)* `decision.conflict.detected` / `authority.override.notification`
104. *(WS push)* `ai.thinking.start|end` / `ai.call.recorded`
105. *(WS push)* `project.init.step.status.changed`

---

## Sidecar references

| Topic | Doc |
|-------|-----|
| Conversation possibilities | [`conversations.md`](./conversations.md) |
| Decision Log + voting + conflict detection | [`decision-log.md`](./decision-log.md) |
| Token estimates + estimate-vs-actual | [`token-estimate.md`](./token-estimate.md) |
| Project init flow (referenced by §T) | [`create-project.md`](./create-project.md) |
| Lifecycle phases + RBAC architecture | [`../architecture/03-project-lifecycle-and-rbac.md`](../architecture/03-project-lifecycle-and-rbac.md) |
