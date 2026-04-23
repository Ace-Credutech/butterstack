# Butterstack V2 — Product Requirements Document (PRD)

**Version:** 1.0 (Initial Lock)
**Date:** April 23, 2026
**Status:** Decisions Locked — Ready for Phase 0 Kickoff
**Based on:** 15 input documents + 37 decisions captured in planning session

---

## 1. Executive Summary

Butterstack V2 is a **ground-up rebuild** of the Butterstack/ClarityOS platform — an AI-powered Requirement Gathering & Prototyping system that converts messy stakeholder conversations into production-ready specifications, live working prototypes, and exportable documents (BRD / Excel / Mindmap).

### 1.1 One-Liner
> **Stakeholder conversations → typed event log → derived projections → live stateful prototypes + exports — with full vocabulary preservation, authority-gated decisions, and real-time multi-user collaboration.**

### 1.2 Why V2 (not incremental on V1)
V1 works but has structural leaks:
- Section classification via render-time regex
- Vocabulary drift across regenerations
- `touchedByUser()` heuristic-based scope detection
- Whole-blob regeneration overwrites user edits
- JSONB-stuffed storage (hard to query / optimize)
- Free-text summaries (not typed)
- Hardcoded AI prompts (not configurable)

V2 fixes these **by design**, not by patching.

### 1.3 Primary User V1
**Business Analyst (BA)** — sits under PM. All project access, no scoping in MVP.

---

## 2. Core Vision & Product Moats

| # | Moat | What it Means |
|---|------|----------------|
| 1 | **Event-Sourced Everything** | Every mutation = typed event, append-only log, full audit trail, undo/redo free |
| 2 | **Authority-Gated Decisions** | Decisions stamped with authority level; overrides trigger soft-prompt + notify original decider |
| 3 | **Role-Scoped Rendering** | Same page looks different to Admin vs Teacher vs Student; role-switcher live in prototype |
| 4 | **Vocabulary Preservation (4-level)** | User + Project + Org + Cross-project glossary; "username ≠ email" stays anchored |
| 5 | **Stateful Prototypes** | localStorage/IndexedDB persist context across page navigations — feels like real app |
| 6 | **Configurable AI Prompts in DB** | Prompts live in SQL, editable via UI, AI can self-modify during dev |
| 7 | **Per-Entity Token Attribution** | Token spend traceable: project → module → feature → page |
| 8 | **Real-Time CRDT Collaboration** | Multiple users editing same feature concurrently, auto-merge via Yjs |
| 9 | **Obsidian-Scale Custom Editor** | Draggable blocks, nested pages, backlinks, graph view — built in-house |

---

## 3. Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Angular 19 standalone + Signals | No NgModules, no NgRx |
| Backend | Hono on Bun | TypeScript throughout |
| Database | PostgreSQL — `butterstack-2` | Max normalized schema |
| Auth | Keycloak (OIDC/OAuth2) | Platform = source of truth for users |
| AI Provider | **Multi-provider router** | OpenRouter + Minmax + Claude Max |
| Voice | Whisper (push-to-talk, streaming) | Single speaker, English + Hinglish only V1 |
| Real-time | WebSocket + Yjs CRDT | True concurrent editing |
| Validation | Zod on every route | Input + output |
| API Contract | OpenAPI auto-emitted | FE client generated from it |
| Editor | **Custom contenteditable + block engine** | Yjs-synced, event-sourced |
| Prototype Output | HTML + Tailwind + vanilla JS | Stateful (localStorage / IndexedDB) |
| Deployment | Coolify (self-hosted, single server) | From V1 plan |

---

## 4. The 37 Locked Decisions (Organized)

### 4.1 Foundation (6 decisions)

| # | Decision |
|---|----------|
| 1 | **Zero-from-scratch**: new repo + new DB `butterstack-2`. Nothing ported verbatim from V1. |
| 2 | **Phase 0 DoD**: Auth + landing + empty workspace live |
| 3 | **Multi-provider AI router**: OpenRouter + Minmax + Claude Max + direct Anthropic/OpenAI |
| 4 | **Keycloak OIDC** as primary auth (already hosted) |
| 23 | **Max-normalized SQL schema** — even projections tabular (no JSONB shortcuts) |
| 35 | **Full event-sourcing** — every mutation (UI edits + AI interactions + everything) = typed event in append-only log |

### 4.2 Input & Capture (7 decisions)

| # | Decision |
|---|----------|
| 5 | **Input = Text + Voice + Image/File upload** (all first-class) |
| 27 | **Voice V1 = minimal**: push-to-talk, single speaker, English + Hinglish only. Multi-speaker arbitration = later. |
| 28 | **Prototype generation = manual** (user clicks "Generate Prototype" explicitly) |
| 29 | **Dual conversation model**: project-level "Planning Mode" chat + per-feature focused threads |
| 30 | **AI Onboarding flow = gradual confirmation**: AI proposes → user confirms each step → AI creates. Never creates silently. |
| 32 | **Project Init = Stepper Flow** (6 steps): base context → file uploads → stakeholders + designations → roles → AI high-level picture → confirm |
| 33 | **Meeting = Mega Conversation Session** (unified concept). Manually started/ended. AI notes decision points, suggests structural changes at end. |

### 4.3 Data Structure (5 decisions)

| # | Decision |
|---|----------|
| 9 | **Tree**: Project → Recursive Modules (N-depth) → Features. **Pages = separate collection** under Project. **Features ↔ Pages = M×N** (many-to-many). |
| 10 | **Roles = first-class entity**, maintained separately from module tree |
| 15 | **Role Capability Matrix = own page** in every project (Rows: Features/Pages, Cols: Roles, Cells: permissions). FE-driven filtering. |
| 16 | **Per-feature context storage** = 3 layers stored separately: raw inputs + requirement tokens + free-text narratives |
| 21 | All storage in **properly normalized SQL tables** — no JSONB dumping grounds |

### 4.4 Authority & Governance (6 decisions)

| # | Decision |
|---|----------|
| 11 | **Authority hierarchy = per-project**, AI-suggested from designations, PM confirms. No org concept in V1. |
| 12 | **Override behavior**: soft-prompt ("Are you sure? Decided by Rajneesh (VP)") + notification to original decider |
| 13 | **Stakeholder onboarding = Step 1** of every project (in the init stepper) |
| 18 | **Glossary = 4-level layered**: User-wise + Project-wise + Org-wise (parked) + Cross-project suggestions |
| 19 | **Versioning trigger = manual only** at start. User clicks "Save Version". Auto-versioning future. |
| 22 | Per-feature versioning also supported (not just project-wide) |

### 4.5 Prototype (4 decisions)

| # | Decision |
|---|----------|
| 6 | **Tech = HTML + Tailwind + vanilla JS**. State via localStorage + IndexedDB + sessionStorage. |
| 7 | **Layered context = 3 levels**: Project context (roles, seeded users, design system — editable by PM/BA) + Plan-time context (AI seeds) + Runtime context (session state) |
| 8 | **Shareable links = fully stateful** (persistence preserved on shared link) |
| 14 | **Role-switcher in prototype viewer**: live toggle "View as Admin / Teacher / Student" |

### 4.6 Intelligence Layer (4 decisions)

| # | Decision |
|---|----------|
| 17 | **Configurable AI prompts in DB from Day 1** |
| 20 | `ai_prompts` table: id, name, template, variables, version, last_edited_by. UI to edit live. Claude/AI can self-modify during dev. |
| 31 | **Impact Analysis + Cascade Suggester = Day 1** (Phase 3). Every change → "ye rename kahan-kahan affect karega" + soft cascade prompts. |
| 36 | **Token attribution = conversation-level + tagged entities**: one conv tags all affected features/pages. Dashboard drilldown: project → module → feature. |

### 4.7 Collaboration + Editor (4 decisions)

| # | Decision |
|---|----------|
| 25 | **Real-time collab = Full CRDT (Yjs)**. True concurrent editing, offline-capable, auto-merge. |
| 26 | **Universal comments**: on any entity (feature / page / module / doc section / token / prototype element). Polymorphic `comments` table. |
| 34 | **Workspace UX = Obsidian + Confluence + Notion hybrid**: fast quick docs + nested structure + block flexibility |
| 37 | **Custom Obsidian-scale block engine** (contenteditable + draggable blocks + nested sub-pages + backlinks `[[x]]` + graph view). Yjs-synced. Event-sourced. |

### 4.8 Exports (1 decision)

| # | Decision |
|---|----------|
| 24 | **Exports = Day 1 priority** (Phase 3 alongside core loop): BRD + Excel + Mindmap + Shareable link. Auto-version on every export. |

---

## 5. Open / Pending Decisions

| # | Question | Status |
|---|----------|--------|
| P-1 | Confidence scoring model: 5-axis DEASV (V1 proven) vs 3-axis (ClarityOS spec) vs configurable per project | **Pending — to decide later** |

---

## 6. Architecture (High Level)

### 6.1 Four-Layer Model (preserved from master-plan.md)

```
┌──────────────────────────────────────────────────────────┐
│ LAYER 4: Surfaces                                         │
│   Workspace · Prototype · BRD · Excel · Mindmap · Share  │
├──────────────────────────────────────────────────────────┤
│ LAYER 3: Projections (derived from State + Events)       │
│   StructuredDoc · UITokens · DEASV Score · Suggestions  │
│   Role Capability Matrix · Impact Set · Token Usage     │
├──────────────────────────────────────────────────────────┤
│ LAYER 2: Events (append-only, typed)                     │
│   user.message · plan.confirm · feature.rename          │
│   slot.set · role.assigned · authority.override         │
│   comment.added · version.saved · prototype.generated   │
├──────────────────────────────────────────────────────────┤
│ LAYER 1: State (projected from events)                   │
│   Projects · Modules · Features · Pages · Roles         │
│   Authority Ladder · Glossary · Events Log              │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Six Information Routes

Preserved from `flow-of-information.md`:

1. **Intent Ingestion** — raw input (text/voice/file) → typed event
2. **State Mutation** — typed event → state delta + event log entry
3. **Projection Fan-Out** — state → derived artefacts (only affected projections)
4. **Render Pipeline** — state → typed blocks → HTML/DOM (pure function)
5. **User Edit Loop** — pixel click → DOM event → typed event (loops back to route 1)
6. **Cascade & Attribution** — event → impact set → suggestions → user confirms → more events

### 6.3 Single Write Path

**All mutations** go through `POST /api/events` with discriminated union body. No side-channel PATCH endpoints for entity updates. REST GETs only for reads.

### 6.4 Invariants (Cannot Be Broken)

1. Single write path (`POST /api/events` only)
2. Event log = append-only, immutable (undo = reverse event, not mutation)
3. State tree = derived from (events + snapshots) — source of truth
4. `source: 'user'` slots **sacred** — AI projector cannot overwrite
5. Glossary project-scoped by default, user-layered
6. Role stored at capture-time, never inferred at render-time
7. Provenance mandatory — every entity has `provenance_events[]`
8. Rendering deterministic — same tokens + design + context → same HTML
9. Projections field-scoped by default ("rebuild everything" = smell)
10. Cascade opt-in — system suggests, user confirms (never silent)

---

## 7. Data Model (High-Level Schema)

### 7.1 Tenancy
- `users` (id, email, name, keycloak_sub, created_at)
- `projects` (id, owner_id, name, slug, created_at, updated_at)
- `project_members` (project_id, user_id, designation, authority_level, role)

### 7.2 Authority & Roles
- `authority_levels` (id, project_id, level, label) — e.g. Level 1 = CEO/VP
- `project_roles` (id, project_id, name) — e.g. Admin, Teacher, Student
- `role_capability_matrix` (project_id, entity_type, entity_id, role_id, capability, allowed)

### 7.3 Tree & Content
- `modules` (id, project_id, parent_id, path, depth, name, order_index)
- `features` (id, module_id, name, pm_status)
- `pages` (id, project_id, name, page_type, layout)
- `page_features` (page_id, feature_id) — M×N join

### 7.4 Per-Feature Context (Normalized)
- `feature_raw_inputs` (id, feature_id, type[text|voice|file|quiz], content, actor_id, authority_level, created_at)
- `feature_requirement_tokens` (id, feature_id, token_type, value, source_input_id, status, authority_stamp)
- `feature_narratives` (id, feature_id, content, actor_id, created_at)
- `feature_structured_doc_sections` (id, feature_id, section_key, content, source[user|ai|default], updated_at)

### 7.5 UI Tokens (Tabular, not JSONB)
- `page_blocks` (id, page_id, order_index, block_kind, role_scope[])
- `block_fields` (block_id, name, type, label, role)
- `block_sections` (block_id, label, role)
- `block_aux_links` (block_id, link_type, text, target)

### 7.6 Glossary (4-layer)
- `glossary_terms` (id, scope[user|project|org|platform], scope_id, canonical, user_word, first_seen_event_id)

### 7.7 Events & Versions
- `events` (id, project_id, actor_id, authority_level, type, payload_json, scope_json, affected_entities_json, source, created_at) — **append-only**
- `version_snapshots` (id, project_id, entity_type[project|feature], entity_id, label, snapshot_json, created_by, created_at)

### 7.8 Conversations & Meetings
- `sessions` (id, project_id, kind[planning|feature|meeting], status, started_at, ended_at)
- `session_participants` (session_id, user_id)
- `messages` (id, session_id, role, content, kind, payload_json, created_at)
- `session_decisions` (id, session_id, feature_id|module_id, decision_text, authority_stamp, created_at)

### 7.9 AI Prompts (Configurable)
- `ai_prompts` (id, name, template, variables_json, version, last_edited_by, updated_at)
- `ai_prompt_versions` (id, prompt_id, template, version, created_at, created_by)

### 7.10 Collaboration
- `comments` (id, entity_type, entity_id, user_id, content, resolved, created_at) — polymorphic
- `crdt_documents` (id, entity_type, entity_id, yjs_update blob, last_snapshot_at) — Yjs state

### 7.11 Jobs & Usage
- `jobs` (id, project_id, kind, scope_json, status, step, error, created_at, started_at, finished_at) — unified table
- `ai_usage_events` (id, conversation_id, user_id, project_id, module_id, feature_id, page_id, provider, model, in_tokens, out_tokens, cost_usd, created_at)
- `api_keys` (id, user_id, provider, encrypted_key)

### 7.12 Quiz & Confidence
- `quiz_sessions` (id, feature_id, user_id, answers_json, completed_at)
- `confidence_scores` (feature_id, d, e, a, s, v, overall, last_computed_at) — **model pending**

---

## 8. Repository Structure

```
butterstack-2/
├── be/                        # Backend (Hono on Bun)
│   ├── src/
│   │   ├── index.ts           # Hono app entry
│   │   ├── env.ts             # Typed env loader
│   │   ├── db.ts              # pg pool + typed query helper
│   │   ├── schema.sql         # Authoritative schema
│   │   ├── migrations/        # Versioned, applied on boot
│   │   ├── domain/            # Pure types (project, module, feature, page, doc, events, context)
│   │   ├── events/            # Event bus, handlers, projector
│   │   ├── ai/                # Client, streamliner, classifier, planner, doc-writer, token-extractor, prompts/
│   │   ├── routes/            # HTTP surface (auth, projects, events, sessions, exports, jobs, ws)
│   │   └── jobs/              # Background queue + runners
│   └── tests/
│
├── fe/                        # Frontend (Angular 19)
│   ├── src/app/
│   │   ├── pages/             # Landing, auth, projects, workspace, confidence
│   │   ├── components/        # Tree, center-tabs, conversation, prototype-iframe, editor, etc.
│   │   ├── editor/            # Custom block engine (contenteditable + Yjs)
│   │   ├── renderers/         # Block dispatch + HTML generation
│   │   ├── iframe/            # Prototype iframe runtime (slot-edit, state mgmt)
│   │   ├── api/               # Generated from OpenAPI
│   │   ├── state/             # Signal-based stores
│   │   └── domain/            # Mirror of backend types
│   └── tests/
│
└── planning/                  # This PRD + specs + contracts + feature-parity
    ├── Butterstack_V2_PRD.md  # This document
    ├── api-contract.md        # Full REST + events surface
    ├── schema.sql             # Authoritative DB schema
    ├── feature-parity.csv     # V1 → V2 tracker
    └── assets/                # Whiteboards, flow diagrams, investor deck
```

---

## 9. Phased Roadmap

### Phase 0 — Scaffolding (Week 1)
**DoD**: Auth + Landing + Empty Workspace live.
- `be/` skeleton (Hono + Bun + env + db + health)
- `fe/` skeleton (Angular 19 standalone + router + landing)
- OpenAPI pipeline wired
- `butterstack-2` DB + schema.sql applied
- Keycloak OIDC integration
- Signup / login / me working end-to-end
- Zod validation on every route from Day 1

### Phase 1 — State, Events, Project Init (Week 2-3)
- Event log infra (append-only, single write path)
- Projects CRUD + stepper init flow (base context → files → stakeholders → roles → preview → confirm)
- Modules CRUD (recursive tree)
- Features + Pages + `page_features` M×N
- Roles + Authority Hierarchy + Role Capability Matrix
- `ai_prompts` table + edit UI (configurable prompts Day 1)
- Tree panel on FE

### Phase 2 — Conversation & Voice (Week 4-5)
- Sessions (planning + per-feature + meeting)
- Streamliner (Hinglish → English)
- Glossary (4-level)
- Classifier (typed intent)
- Planner (proactive module proposal)
- Gradual confirmation flow UI
- **Voice input Day 1** (push-to-talk, Whisper, single speaker, EN+HI)

### Phase 3 — Projections, Prototype, Exports (Week 6-9)
- StructuredDoc generator (field-scoped, preserves user-source)
- UITokens extractor (tabular, role-tagged)
- Projection job runner + live step updates via WebSocket
- **Stateful prototype** (HTML+Tailwind+JS + localStorage/IndexedDB)
- Role-switcher in prototype viewer
- Impact Analysis + Cascade Suggester
- BRD + Excel + Mindmap exports
- Shareable public link (stateful)

### Phase 4 — Editor & Real-Time Collab (Week 10-14)
- **Custom Obsidian-scale block engine** (contenteditable + draggable + nested + backlinks + graph)
- **Yjs CRDT integration** (real-time concurrent editing)
- Slot-edit custom element (replaces V1 data-tp)
- Inline rename + cascade warnings
- Universal comments on any entity

### Phase 5 — Polish & Advanced (Week 15-17)
- Confidence scoring (model TBD from pending decision)
- Quiz generator + DEASV
- Token usage dashboard (project / module / feature granularity)
- Version snapshots + restore + diff viewer

### Phase 6 — Intelligence & Ops (Week 18-20)
- Suggestions engine
- Authority override notifications
- V1 → V2 migration script
- Parity tests

**Honest total estimate: 20 weeks (~5 months) of focused work** — driven by Phase 4 (editor + CRDT) being the single heaviest block.

---

## 10. Scope & Risk Flags

### 10.1 Heavy-Engineering Areas (flagged honestly)

| Area | Complexity | Reason |
|------|-----------|--------|
| Custom block editor | **Very High** | Obsidian-scale scope; selection, undo, paste, table, nested blocks — all hard |
| Yjs CRDT + event log reconciliation | **High** | Two sources of truth (CRDT ops + events) need careful marriage |
| Stateful prototype with role-switch + IndexedDB | **High** | Multi-page state persistence, role-conditional rendering |
| Max-normalized schema | **Medium-High** | ~40-50 tables vs V1's ~22; more joins, slower to iterate but strongest foundation |
| Impact Analysis + Cascade | **Medium** | FK graph walking + LLM-driven suggestion UX |

### 10.2 Dependencies on External Systems
- **Keycloak** — already running; integration, not setup
- **AI providers** — OpenRouter + Minmax + Claude Max reliability
- **Coolify deployment** — single-server; capacity TBD

### 10.3 De-Scoped / Parked
- Organization concept (projects only for V1)
- Multi-speaker voice arbitration
- Org-wide glossary layer
- Auto-versioning (manual only initially)
- Real-time collab on prototype (edit doc collab only V1)

---

## 11. Decision Journal — Changes from Original `master-plan.md`

| Original Plan | New V2 Decision | Rationale |
|---------------|-----------------|-----------|
| Hosted AI default | Multi-provider router | Flexibility + cost control |
| Prototype = HTML+Tailwind generated fresh | Prototype = **stateful** (localStorage/IndexedDB) | Real working app feel (Sameer's Q2 from work-1.md) |
| Flat roles | **Authority hierarchy + override prompts** | Client request for VP > PM > BA decision tracking |
| Glossary project-scoped | 4-level (user + project + org + cross-project) | User-personal vocabulary is valuable |
| Auto-version on export | **Manual only at start** | Keep simple; evolve as needed |
| Confidence scoring 5-axis DEASV | **Pending** | Re-evaluating model |
| Voice deferred | **Voice Day 1 (minimal)** | Aggressive V2 scope confirmed |
| Meeting = timeline grouping | **Meeting = Mega Conversation Session** (unified) | Cleaner conceptual model |
| Editor TBD | **Custom block engine (Obsidian-scale)** | No dependencies, full control |
| Exports Phase 5 | **Exports Day 1 (Phase 3)** | Core deliverable, needed early |

---

## 12. User Journeys

### 12.1 BA Creates New Project
1. BA logs in (Keycloak)
2. Clicks "New Project" → enters 6-step stepper:
   - Step 1: Brief description
   - Step 2: Upload existing docs/Excel (optional)
   - Step 3: Add stakeholders + designations → AI suggests authority levels → confirm
   - Step 4: Define roles (Admin, Teacher, Student...) → Role Capability Matrix seeded
   - Step 5: AI presents high-level module structure for confirmation
   - Step 6: Final confirm → workspace opens
3. BA is in workspace with tree + conversation + prototype tabs

### 12.2 BA Adds a Feature via Conversation
1. BA opens per-feature chat
2. Types "Student should be able to upload ID photo" (any language — Hinglish OK)
3. AI streamlines + classifies
4. AI asks clarifying Qs (MCQ-style) with gradual confirmation
5. BA confirms each step → AI creates feature + doc sections (user-source preserved)
6. BA clicks "Generate Prototype" → stateful HTML page rendered
7. BA toggles role-switcher → sees how Admin vs Student view differs
8. BA edits a label inline → event fires → glossary captures → cascades suggested

### 12.3 Rajneesh (VP) Makes a Decision, Shubhangi (PM) Tries to Override
1. Rajneesh in meeting mode: "Login must use email only, no username"
2. AI captures as `session_decision` with `authority_level: 1 (VP)`
3. Days later, Shubhangi edits feature: "Allow username OR email login"
4. Soft-prompt fires: "This conflicts with a decision by Rajneesh (VP). Are you sure? [Override] [Cancel]"
5. If Override: event fires with `override_target_event_id` → Rajneesh gets notification

### 12.4 Multi-User Real-Time Edit
1. Shubhangi + Priya both open the same feature doc
2. Yjs CRDT syncs via WebSocket
3. Both type concurrently in different paragraphs → auto-merge
4. Both see each other's cursors + selections live
5. Every merge op = event in the event log for audit

### 12.5 Export Shared With Client
1. PM clicks "Export BRD"
2. System auto-creates version snapshot (whiteboard rule)
3. HTML BRD generated from tabular doc data
4. Also Excel + Mindmap options
5. Shareable public link created — client views stateful prototype
6. Client clicks around — state persists in their browser session

---

## 13. Glossary of New V2 Concepts

| Term | Meaning |
|------|---------|
| **Event** | Typed, scoped mutation captured in append-only log. Single write path. |
| **Authority Level** | Numeric rank (1=highest) assigned per project stakeholder based on designation |
| **Authority Stamp** | Metadata on any decision/event recording who made it + their authority level |
| **Requirement Tokens** | Typed, user-approved decisions (distinct from raw input) |
| **Role Capability Matrix** | Dedicated page per project: Features × Roles = allowed/denied |
| **Role Scope** | Array of roles an event/token/block applies to |
| **Stateful Prototype** | HTML prototype with client-side state (localStorage/IndexedDB) across page navs |
| **Cascade Suggester** | AI step that proposes downstream edits after a primary mutation |
| **Impact Set** | Collection of entities affected by a given event (computed from FKs + provenance) |
| **Mega Conversation / Meeting** | Manually-bounded planning session (unified concept) |
| **Configurable Prompt** | AI prompt stored in DB row, editable via UI, versioned |
| **Glossary Layers** | 4 levels: User / Project / Org (future) / Cross-project suggestions |
| **Provenance** | `provenance_events[]` array on every entity = which events created/changed it |
| **Source Tag** | `source: 'user' | 'ai' | 'default'` on every doc field; user-source is sacred |

---

## 14. What V2 Deliberately Does NOT Do

1. **Does not replace the BA** — AI-assisted, not AI-autonomous
2. **Does not add process overhead** — every interaction must feel lighter than V1
3. **Does not force clients to learn software** — conversational UX, not tool training
4. **Does not silently cascade changes** — every cascade is opt-in with preview
5. **Does not drop user's vocabulary** — glossary anchors every export
6. **Does not use render-time regex for UI classification** — role stored at capture
7. **Does not have hidden state** — event log is auditable, attributable, replayable

---

## 15. Definition of Done (V2 GA)

- [ ] Fresh BA can sign up, complete 6-step project init, have a conversation, and see a stateful live prototype in < 10 minutes
- [ ] Every user-edited text survives every regeneration (zero exceptions)
- [ ] Vocabulary preserved 100% across exports (automated test)
- [ ] Role-based section routing has zero regex on label text
- [ ] All backend routes have Zod + OpenAPI schemas
- [ ] FE client 100% generated from OpenAPI
- [ ] Every mutation goes through `POST /api/events`
- [ ] Real-time collab works with 3+ users editing same feature (Yjs + events reconciled)
- [ ] Authority override triggers correct soft-prompt + notification
- [ ] Role-switcher toggles prototype view correctly
- [ ] Voice input transcribes Hinglish correctly > 80% of the time
- [ ] Token attribution dashboard shows project/module/feature breakdown
- [ ] Full export triad (BRD + Excel + Mindmap) working with auto-versioning
- [ ] V1 → V2 migration script passes parity tests

---

## 16. Reference Inputs (This PRD Consolidates)

| Document | What It Contributed |
|----------|---------------------|
| `master-plan.md` | 4-layer architecture, phased roadmap, schema first pass |
| `investor-architecture.md` | Moats, positioning, before/after framing |
| `product-flow-whiteboard.md` | User Input Tokens, Requirement Tokens, event strip |
| `flow-of-information.md` | 6 routes, 10 invariants, typed data lineage |
| `Butterstack_Phase1_Product_Definition.md` | Research basis (5 interviews, 3 personas), 16 features, 5 pillars, moats |
| `ClarityOS_UI_Specification_v2.md` | Left panel tree, center tabs, 15 BRD sections, quiz modal spec, DEASV formula |
| `toal-current-work.md` | V1 end-to-end walkthrough (what's already built) |
| `feature-parity.csv` | 82 capabilities V1→V2 tracked with priority & phase |
| `Client_Requirement.md` | Vision statement, voice arbitration, Keycloak, BA as V1 user |
| `work-1.md` | April 21 meeting — Requirement Confidence Score, stateful prototype (Sameer's Q), Design System |
| `VBSA_Mega__BRD.doc` | Reference BRD benchmark (client sample) |

---

## 17. Next Immediate Actions

1. **Resolve Pending Decision P-1** (Confidence scoring model)
2. Bootstrap `butterstack-2` repo (`be/`, `fe/`, `planning/`)
3. Write `planning/api-contract.md` (exhaustive events + REST surface)
4. Write `planning/schema.sql` (authoritative, normalized, ~40-50 tables)
5. Kick off Phase 0 scaffolding

---

**End of PRD v1.0** — Locked 37 decisions + 1 pending. Ready for build.
