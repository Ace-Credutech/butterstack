# Butterstack V2 — Master Architecture & Work Plan

> Single source of truth. Update this before building anything.

---

## 1. Core Principles (Non-Negotiable)

### 1.1 Every AI Call Through One Function
- ALL AI calls go through `prompts.run()` (or the `invoke_ai()` wrapper).
- The model, temperature, max_tokens, system_text, user_template all live in `prompt_versions` table.
- Configurable via admin UI at `/admin/prompts`.
- **Every AI response must be structured JSON. No exceptions. Ever.**
- Response schema is defined per prompt. The AI always returns JSON matching that schema.

### 1.2 Single WebSocket Connection Per User
- One WS connection per logged-in user, established at app root on authentication.
- Events are dispatched by topic: `user:<id>` and `project:<id>`.
- When a document in a project is parsed → signal sent to all project members on `project:<id>`.
- When a user-level doc is parsed → signal sent to `user:<id>`.
- Frontend: `WsService` is singleton. `connect()` called once in `App` root component on `auth.authenticated()` becoming true.

### 1.3 Everything Configurable
- Every prompt: editable model, temperature, max_tokens, system_text, user_template via admin.
- Every AI call type is an enum (`document.parse`, `context.compress`, etc.).
- Admin section: `/admin/prompts` shows all prompts with edit capability.

### 1.4 BullMQ for All Async Work
- Heavy operations (document parsing, context indexing) via BullMQ from day one.
- Worker pattern: one file per worker under `src/workers/<name>/<name>.worker.ts`.
- Registered in `src/workers/queue-registry.ts`.
- Workers call internal API endpoints (`POST /api/internal/<action>`).

### 1.5 Generic Components Everywhere
- `<bs-documents-panel entity_type="project|org|user" [entity_id]="id" />` — works for any entity.
- No duplicated logic across project/org/user document views.

---

## 2. Organisation Model

### 2.1 Concept
- Every user has exactly one **personal organisation** auto-created at signup.
- Name: `"{FirstName}'s Organization"` (derived from first name).
- Type: `'personal'` (vs `'team'` for shared orgs).
- A user can belong to multiple organisations (via `organisation_members` table).
- **Billing is per organisation**, not per user.

### 2.2 Auto-create on Signup
- In `ensure_user_from_claims()`: after upsert, check if personal org exists for this user.
- If not → create org + add user as `owner` in `organisation_members`.
- Org slug: `"{keycloak_sub}-personal"` (stable, unique).

### 2.3 Existing Users (Backfill)
- Migration: for every user in `users` table who has no row in `organisation_members` → create personal org + membership.

### 2.4 DB Tables (already exist)
```
organisations:         id, slug, name, type, created_by, created_at, updated_at, deleted_at
organisation_members:  org_id, user_id, role, invited_by, joined_at, created_at, updated_at
projects:              ... org_id (already present)
```

---

## 3. Document System

### 3.1 Entities That Can Have Documents
- `project` — project-level documents (requirements, BRDs, etc.)
- `org` — organisation-level documents (brand guidelines, policies)
- `user` — user-level documents (personal notes, resumes)

### 3.2 DB Schema

**`project_documents`** — one row per uploaded file:
```
id, filename, mime_type, size_bytes, storage_key, kind, purpose,
parse_status (pending|parsed|failed), parse_error,
parsed_text (full extracted plain text),
keywords TEXT[] (GIN index — for fuzzy search),
ai_name, ai_summary,
uploaded_by, created_at, updated_at
```
Note: `parsed_content JSONB` removed — replaced by separate tables below.

**`document_links`** — links a document to any entity:
```
id, document_id, entity_type (project|org|user), entity_id, linked_by, created_at
```

**`document_passages`** — normalised sequential chunks (NEW, migration 057):
```
id, document_id, idx (0-based, unique per doc), type, heading, text, created_at, updated_at
```
Types: `objective | requirement | decision | risk | data | meeting_note | action_item | finding | constraint | assumption | other`

**`document_entities`** — named entities extracted from doc (NEW, migration 057):
```
id, document_id, name, type (role|system|module|person|org), created_at, updated_at
```

### 3.3 Document Passage — The Atomic Citable Unit
- Each passage has a globally stable reference: `(document_id, idx)`.
- Future: a decision can say "source: document_id=X, passage_idx=5" — trace exactly which paragraph drove that decision.
- Keywords from all passages are rolled up to `project_documents.keywords[]` for fast GIN fuzzy search.

### 3.4 Upload Flow
1. Client uploads file (base64) → `POST /api/documents/upload`
2. Backend: save to MinIO, insert `project_documents` (status=`pending`), insert `document_links`.
3. Publish `document.parse` job to BullMQ `documents` queue (delay 500ms).
4. Return immediately — client sees `pending` chip.

### 3.5 Parse Flow (Background)
1. Worker picks up job → calls `POST /api/internal/document-parse`
2. Downloads file from MinIO.
3. Routes through `extract_document_ai()`:
   - Text files → `run_prompt('document.extract', { filename, content })` — prompt registry path.
   - Images/PDFs → direct OpenAI call with vision.
4. AI returns structured JSON (passages, entities, keywords).
5. Save: `document_passages` (bulk insert), `document_entities` (bulk insert), update `project_documents` (parsed_text, keywords, ai_name, ai_summary, parse_status=`parsed`).
6. Broadcast WS event `document.parsed` to all project members (or org members, or user).

### 3.6 WS Event on Parse Complete
```json
{
  "type": "document.parsed",
  "payload": {
    "document_id": "...",
    "entity_type": "project|org|user",
    "entity_id": "...",
    "parse_status": "parsed|failed",
    "ai_name": "...",
    "ai_summary": "...",
    "parse_error": null,
    "passage_count": 12,
    "keyword_count": 24
  }
}
```

### 3.7 AI Prompt: `document.extract`
- Slug: `document.extract`
- Model: `gpt-4.1` (configurable via admin)
- RAG strategy: `null` (skip context retrieval — document IS the context)
- Response: always JSON matching this schema:
```json
{
  "ai_name": "kebab-case-name",
  "ai_summary": "2-3 sentences",
  "extracted_text": "full plain text",
  "passages": [
    { "idx": 0, "type": "requirement", "heading": "Section Name", "text": "..." }
  ],
  "entities": [
    { "name": "PM Role", "type": "role" }
  ],
  "keywords": ["keyword1", "keyword2"]
}
```

---

## 4. Context System

### 4.1 What Is a Context?
- A normalised, retrievable piece of knowledge scoped to org/project/user/platform.
- Stored in `contexts` + `context_chunks` tables (already exist).
- Source: manually written, promoted from conversation, OR extracted from document passages.

### 4.2 Document → Context Promotion (Future)
- A document passage can be promoted to a context chunk.
- `context_origins.source_kind = 'document'`, `source_ref = { document_id, passage_idx }`.
- This enables: "why did we make this decision?" → trace back to exact passage in exact document.

---

## 5. Project Creation Flow

Steps (create-project wizard):
1. **Step 1 — Project Info**: name, brief, visibility. Creates project + org association.
2. **Step 2 — Documents**: Upload org/project documents via `<bs-documents-panel>`. Parsing happens in background.
3. **Step 3 — Team**: Invite members (future).
4. **Step 4 — Context Setup**: Add or review auto-extracted contexts from uploaded docs (future).
5. **Step 5 — Done**: Navigate to project.

---

## 6. Admin / Prompts

All prompts editable at `/admin/prompts`:
- List all prompts with slug, category, current model, status.
- Edit: system_text, user_template, model, temperature, max_tokens, response_format.
- Prompt categories: `project`, `intake`, `regenerate`, `admin`, `context`, `conversation`, `system`, `document`.

Current prompts (seeded):
- `document.extract` — document parsing
- `context.expand_query` — RAG query expansion
- `context.compress_for_query` — RAG compression
- `context.classify_intent` — intent classification
- `context.engineer` — context engineering agent
- `conversation.reply` — chat reply
- `translate.user_input` — translation
- `project.skeleton_suggest` — project skeleton

---

## 7. Current DB State (as of April 28 2026)

All 56 migrations applied. Key tables:

| Table | Status | Notes |
|-------|--------|-------|
| `users` | ✅ | keycloak_sub, role_id |
| `organisations` | ✅ | type col: personal/team |
| `organisation_members` | ✅ | org_id, user_id, role |
| `projects` | ✅ | org_id present |
| `project_documents` | ✅ | has parsed_content JSONB (to be replaced by passages tables) |
| `document_links` | ✅ | entity_type + entity_id polymorphic |
| `document_passages` | ❌ | migration 057 pending |
| `document_entities` | ❌ | migration 057 pending |
| `contexts` | ✅ | |
| `context_chunks` | ✅ | |
| `prompts` + `prompt_versions` | ✅ | document.extract seeded with gpt-4.1 |
| `project_members` | ✅ | |
| `conversations` | ✅ | |

---

## 8. What Needs to Be Built (Ordered)

### Phase A — Foundation (Do First)
- [ ] **A1**: Org auto-create on signup (`ensure_user_from_claims` + personal org)
- [ ] **A2**: Backfill existing users with personal orgs (migration)
- [ ] **A3**: Recreate lost backend code (models, API files, workers) — all files lost in git incident
- [ ] **A4**: Run migration 057 (document_passages + document_entities tables)

### Phase B — Document System
- [ ] **B1**: `project-document.model.ts` + `document-link.model.ts` models
- [ ] **B2**: `document-passage.model.ts` + `document-entity.model.ts` models  
- [ ] **B3**: `extract-document.ts` — AI extraction returning passages/entities/keywords
- [ ] **B4**: `document-parse` BullMQ worker — saves passages + entities to separate tables
- [ ] **B5**: Upload, list, get-content, get-url, delete document APIs
- [ ] **B6**: WS broadcast to project/org members on parse complete

### Phase C — Frontend
- [ ] **C1**: `DocumentsService` with WS subscription + `last_parsed` signal
- [ ] **C2**: `<bs-documents-panel>` generic component (project/org/user)
- [ ] **C3**: Beautiful parsed content view (passages with type chips, keywords, entities)
- [ ] **C4**: `App` root → `ws.connect()` on auth
- [ ] **C5**: Project create Step 2 using generic panel

### Phase D — Organisation UI
- [ ] **D1**: Org settings page with org-level document panel
- [ ] **D2**: Org context view

---

## 9. File Architecture (V2 BE)

```
src/
  apis/
    auth/          — login, register, logout, refresh, forgot/reset password
    admin/         — prompts, contexts, roles, users
    documents/     — upload, list, get-content, get-url, delete, parse (internal)
    projects/      — create, list, get, update, members
    organisations/ — create, get, update, members
    contexts/      — create, list, retrieve, promote
  models/
    user.model.ts
    organisation.model.ts
    organisation-member.model.ts
    project.model.ts
    project-member.model.ts
    project-document.model.ts
    document-link.model.ts
    document-passage.model.ts
    document-entity.model.ts
    context.model.ts
    context-chunk.model.ts
    prompt.model.ts
    prompt-version.model.ts
    ...
  setup/
    ai/
      extract-document.ts     — document extraction (via prompt registry)
      invoke-ai.ts            — wrapper around prompts.run()
    prompts/
      run/
        index.ts              — prompts.run() — THE single AI call function
        ai-call.ts            — routes to OpenAI/Anthropic based on model name
    ws/
      ws-server.ts            — WS upgrade (accepts ?access_token JWT), broadcast_to_user/project
    storage/
      minio.ts                — upload_file, download_file, get_presigned_url
  workers/
    document-parse/
      document-parse.worker.ts
    queue-registry.ts
  enums/
    document.enums.ts
    prompt.enums.ts
```

---

## 10. Key Decisions Log

| Decision | Rationale |
|----------|-----------|
| Passages in separate table (not JSONB) | Each passage is individually citable by (document_id, idx). Future: link decisions/contexts to exact passage. |
| Keywords in project_documents.keywords TEXT[] | GIN index for fast fuzzy search across all documents. |
| AI always returns JSON | Predictable parsing, no markdown cleanup, directly storeable. |
| All AI calls via prompts.run() | Single trace point, configurable without deploy, admin editable. |
| BullMQ for document parsing | Upload stays fast (<1s). Parsing can take 5-30s depending on doc size. |
| One WS per user | Simpler, no connection management per-component. Events dispatched by topic. |
| document_links polymorphic | Same document can belong to project + org. Entity type = project|org|user. |
| Personal org auto-created | Billing anchor. User always has at least one org. |
