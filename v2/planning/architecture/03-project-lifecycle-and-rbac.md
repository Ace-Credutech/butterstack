# Butterstack V2 — Project Lifecycle & RBAC Capture

Two distinct phases. Capture rules differ.

---

## Phase A — Project Creation (6-step Stepper)

Tree does not exist yet. **Roles** are system personas in the app being built. **Members** are real humans on the project.

| Step | Captured | Events emitted |
|------|----------|----------------|
| 1 | Project brief | `project.create` |
| 2 | Documents (BRDs / Excel / mocks / PDFs) | `project.document.upload` × N |
| 3 | **Roles** (Admin / Teacher / Student — personas inside the app being built) | `role.create` × N |
| 4 | **AI Clarification Chat** (multi-turn; AI sees brief + docs + roles + prior turns) | `session.start (kind: 'project-init-clarify')` → `message.add` × N → `session.end` |
| 5 | **Members** (name, email, designation, stakeholderRole, authorityRank — all inline) | `member.add` × N |
| 6 | AI module skeleton → confirm → workspace opens | `project.init.skeleton.suggest`, `module.create` × N |

Each step closes with `project.init.step { step: N, status: 'done' }`.

### Roles vs Members

| | **Roles** | **Members** |
|---|-----------|-------------|
| What | User personas in the **product** being built | Real humans **building** the project |
| Examples | Admin, Teacher, Student | Rajneesh (VP), Akash (BA) |
| Captured at | Step 3 | Step 5 |
| Lives in | `roles` table | `project_members` table |
| Used for | Capability matrix rows, prototype role-switcher, role-scoped blocks | Authority gating, attribution, notifications |

### Why Members at Step 5 (not earlier)

- By Step 4 the AI + PM understand the app's scope from documents + clarification chat.
- That informs **who needs to be involved as a stakeholder** and at what authority — instead of dumping a default org chart upfront.
- Authority is captured **inline** (`authorityRank` column) — no separate ladder table, no separate suggest job.

### What is NOT captured at init
- Capabilities (RBAC cells) — tree doesn't exist yet
- Features, pages, requirement tokens — emerge in Phase B

---

## Phase B — Tree Growth & RBAC Decisioning (post-init, ongoing)

As Modules → Sub-Modules → Features get created (via conversation or manual), the **Role Capability Matrix** page becomes the live RBAC control surface.

### Matrix shape
- **Rows:** Modules / Sub-Modules / Features / Pages (as they appear in the tree)
- **Cols:** Roles (from Phase A Step 3)
- **Cells:** `{ allowed: bool, capability: 'view|create|edit|delete|approve|export|...', narrative: string, source: 'user|ai' }`

### Per-cell narrative
Every cell carries a **short paragraph** explaining what granting this permission lets the role *actually do*.

- AI generates the initial narrative when an entity (row) appears.
- PM/BA can edit any narrative — once edited, `source = 'user'` and AI never overwrites it (sacred-source rule).
- Narrative regen is explicit (`capability.narrative.regenerate` event).

### Lifecycle of a row
```
new module/feature/page created
        ↓
projector enqueues capability matrix expansion
        ↓
for each role × new entity × capability:
   - cell created with allowed = false (deny by default)
   - AI generates draft narrative; source = 'ai'
        ↓
PM/BA opens RBAC page → flips flags + edits narratives
        ↓
on edit: capability.set / capability.narrative.set events
        ↓
narrative source flips to 'user' on first edit (sacred)
```

### Default policy
- **Deny by default.** Every new cell starts `allowed = false`.
- **Authority-gated changes:** capability flips on Modules of strategic weight require `authorityRank ≤ N` (configurable per project).
- **Cascade:** flipping a Module-level capability prompts ("apply to all child features?") — opt-in, never silent.

---

## Schema impact (additions to PRD §7)

Add tables:

| Table | Purpose |
|-------|---------|
| `project_documents` | Step-2 uploads. `(id, project_id, filename, mime_type, size_bytes, storage_key, kind, uploaded_by, created_at)` |
| `roles` | Step-3 system personas. `(id, project_id, name, description, created_at)` |
| `project_members` | Step-5 stakeholders. `(id, project_id, user_id|email, name, designation, stakeholder_role: 'decider'|'reviewer'|'contributor'|'observer', authority_rank int, created_at, updated_at)` — all governance inline, no separate ladder |
| `capability_cells` | Phase-B RBAC. `(id, project_id, role_id, entity_type, entity_id, capability, allowed, narrative, narrative_source: 'user'|'ai', last_edited_by, created_at, updated_at)` — UNIQUE(project_id, role_id, entity_type, entity_id, capability) |
| `capability_narrative_versions` | Audit history of narrative edits. `(id, cell_id, narrative, source, edited_by, created_at)` |

**Removed from PRD §7.2 plan:** `authority_levels` table — unnecessary; authority is a column on `project_members`.

---

## API impact (already applied to `api-catalog.md`)

- `GET /api/projects/:id/roles`
- `GET /api/projects/:id/members`
- `GET /api/projects/:id/documents`
- `GET /api/documents/:id/download`
- `POST /api/uploads/sign`
- `GET /api/projects/:id/init-skeleton`
- `GET /api/projects/:id/init-state` (stepper resume)
- `GET /api/projects/:id/capability-matrix?withNarratives=true`
- `GET /api/capability-cells/:id`

## Event impact (already applied to `events-catalog.md`)

- Stepper: `project.create`, `project.init.step`, `project.document.upload/delete`, `role.create/rename/update/delete`, `member.add/update/remove`, `project.init.skeleton.suggest`, `module.create`
- Clarification chat: `session.start (kind: 'project-init-clarify')`, `message.add`, `session.end`
- RBAC: `capability.set`, `capability.narrative.set`, `capability.narrative.regenerate`
- Governance: `authority.override` (only — authority itself is inline on members)
