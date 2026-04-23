# Butterstack — End-to-End Component Walkthrough

_A file-by-file, component-by-component guide to the entire system. For each piece: what it is, what it does, what it talks to, and the important details. Read this top to bottom and you'll have the whole mental model._

---

## PART A — BACKEND (`api/`)

The backend is **Hono on Bun**, talking to **PostgreSQL**. Single binary runs dev and prod. In prod it also serves the built Angular bundle.

### A.1 Entry & config

**`api/index.ts`** — the Hono app. Mounts JWT auth middleware (except `/auth/*`), registers every route module under `/api/*`, and in prod serves `web/dist/web/browser/` for all non-API paths (SPA fallback).

**`api/db.ts`** — thin `pg` wrapper exposing `query(sql, params)`. Single pool, no ORM.

**`api/migrate.ts`** — idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE IF NOT EXISTS ADD COLUMN` for the whole schema. Run once after a pull with `bun migrate.ts`. Tables: `users`, `projects`, `project_members`, `modules`, `features`, `pages`, `page_features`, `prompt_cache`, `token_cache`, `local_dictionary`, `regeneration_log`, `history`, `elicitation_sessions`, `elicitation_messages`, `quiz_sessions`, `comments`, `project_tokens`, `reprocess_jobs`, `usage_events`, `api_keys`.

**`api/.env`** — `AI_PROVIDER`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MODEL_STREAMLINE`, `MODEL_TOKENS`, `POSTGRES_DB_STRING`, `JWT_SECRET`.

---

### A.2 `api/lib/` — the brains

#### `ai-client.ts`
Unified AI client. `aiChat(messages, model, jsonMode, maxTokens, userId)` works for both OpenAI and Anthropic depending on `AI_PROVIDER`. Also logs token usage to `usage_events` keyed by `userId` so we can show per-user spend.

#### `auth.ts`
JWT sign / verify via `jose`. The middleware reads `Authorization: Bearer <token>`, puts `userId` onto the Hono context. Guarded routes do `c.get('userId')`.

#### `streamline.ts` + `local-streamline.ts`
Hinglish / Minglish / Gujarati → clean English. Two-layer: `local-streamline` does a fast local dictionary pass first, then `streamline` falls back to AI only if anything is left non-English. This is what lets a user say "ID card chahiye with student photo aur QR code" and have the AI see "I need an ID card with a student photo and a QR code."

#### `dictionary.ts`
A self-improving in-memory dictionary of word mappings. Populates from every AI response, flushes to `local_dictionary` every 5 seconds. Over time this reduces AI calls for common phrases.

#### `fuzzy.ts`
pg_trgm similarity lookup with threshold **0.88** (high — prevents "Username Login" matching "User Registration"). Used before calling the expensive token extractor to see if we already have something close enough.

#### `cache.ts` + `hash.ts`
Two-level cache: exact SHA256 hash on raw input → clean prompt, then SHA256 on clean prompt → UITokens. Fuzzy fallback after exact miss. Every write goes through here; every read tries exact → fuzzy → AI.

#### `openai.ts` (extractor)
`extractTokens(cleanPrompt, {bypassCache})` — turns a clean English prompt into `UITokens`. System prompt includes the full token schema + hard rules: preserve user vocabulary (username ≠ email for login), classify sections with a `role`, never invent auth methods, emit semantic blocks only. `bypassCache: true` forces a fresh AI call — used by reprocess and elicitation complete so stale cached tokens don't shadow fresh vocabulary.

#### `elicitation.ts`
The core of the conversation → structure pipeline. Exports:

- `SYSTEM_PROMPT` — the conversational AI's instructions. Rewrites the "no why questions" rule to **require** purpose/motivation probes roughly 1 in 3 messages.
- `BREAKDOWN_PROMPT` — turns a completed conversation into `{modules, pages}`. Includes:
  - Strict **NOT-features** list (buttons, fields, legal links, requirement verbs like "Include X")
  - **PRESERVE VOCABULARY** rule
  - **PROACTIVE PLANNING** rule — when the user says "propose / plan / design", return an opinionated 3-6 module first-cut using domain knowledge instead of an empty array
  - **ALWAYS EMIT PAGES** rule — for every feature, emit at least one page with a pageType
- `DOC_PROMPT` — feature documentation template. 15 sections (Description, Assumptions, Functionalities, Validations, Functional Flow, Error Messages, UI/UX, Acceptance Criteria, Business Rules, Pre/Post-Conditions, Edge Cases, Impact, Open Questions, Backend, Role Access Mapping). Role Access Mapping has a mandatory pipe-table worked example. Supports **incremental updates** — if `existingDoc` is passed, strict rules say "preserve unchanged sections verbatim, only modify what this conversation addresses."
- `generateBreakdown(context, existingModules, userId, conversationHistory, priorSessionSummaries)` — assembles the context + transcript + prior summaries and calls the AI. Passes through `sanitizeBreakdown()`.
- `sanitizeBreakdown()` — strips non-feature noise: buttons, fields, legal terms, "no X / without Y" exclusions, "Include X / Add Y" requirement verbs.
- `generateDocumentation(feature, context, existingDoc?, priorSessionSummaries?)` — generates or incrementally updates a feature's doc.
- `generateQuestion(context)` — asks the next clarifying question in conversation. `SYSTEM_PROMPT` encourages "why" probing.
- `buildContextSummary(context)` — turns extracted entities/actors/actions into a text summary for the prompt.
- `getRecentProjectTranscript(projectId)` — pulls the last N messages across sessions so reprocess jobs have full context, not just session summaries.
- `touchedByUser(session, featureName)` — heuristic with narrow/medium/broad scope rules to decide if a session's changes really apply to a given existing feature. Prevents a casual mention of "login" from retriggering doc regen on every login-adjacent feature in the project.

#### `brd-generator.ts`
Walks `modules → features → pages` for a project, stitches the 15 sections of each feature into a cohesive HTML BRD. Includes executive summary, module breakdown, page specs, conversation history appendix.

#### `excel-generator.ts`
Uses SheetJS (`xlsx`). 4 sheets: Modules, Features (with truncated AI description + confidence score), Pages (with linked features), Requirements Summary (extracts acceptance criteria / assumptions / validations / error messages from each feature's AI description). Returns Buffer for download, JSON preview for in-app view.

#### `mindmap-generator.ts`
Whimsical-style interactive HTML. Server-side generates a standalone page with embedded CSS + JS: SVG bezier edges, pan/zoom (wheel centered on cursor), expand/collapse, Expand all / Collapse all / Reset view toolbar.

#### `project-tokens.ts`
CRUD for `project_tokens` table. Stores `design_system` (primaryColor, borderRadius, fontFamily, etc.) and `prototype_context` (currentUser name/email/avatar, realistic stats, recent items) — both applied at render time so prototypes feel like the real app.

#### `renderer.ts`
Backend-side renderer used by BRD/mindmap where we need HTML server-side. Mirrors the frontend's dynamic renderer at a simpler level (doesn't need the edit scaffolding).

#### `diff.ts`
Produces a diff between old and new tokens for the regeneration log. Shows what changed when a user says "add a Sign Up link" → regenerated tokens have a new section; the diff tells us what's actually different.

#### `logger.ts`
Structured logger. Every AI call, every cache hit/miss, every job step goes through here. Enables the "live step" UX.

#### `batch.ts`
Batches multiple token extractions into one AI call when a session creates many features at once. Keeps latency reasonable at session complete.

---

### A.3 `api/routes/` — the HTTP surface

Each folder is a Hono sub-app mounted at `/api/<folder>`.

#### `auth/`
`POST /auth/signup`, `POST /auth/login`, `GET /auth/me`. JWT-based. Skipped by the global auth middleware.

#### `projects/`
`GET /projects`, `POST /projects`, `GET /projects/:id`, `PATCH /projects/:id` (rename), `DELETE /projects/:id`. Also `GET /workspace/init?projectId=X` — a single call that returns modules + features + pages + pageFeatures + history + design system + prototype context. Used at page load to avoid 5 separate round-trips. Also `GET /projects/:id/design-system` and `GET /projects/:id/prototype-context`.

#### `modules/`
`POST /modules` (create at any depth with `parentId`), `GET /modules/tree?projectId=X` (recursive CTE tree), `PATCH /modules/:id` (rename — updates name + slug), `DELETE /modules/:id` (recursive cascade: collects all descendant module ids, deletes their features, then deletes the modules). Also `POST /modules/auto-assign` — AI matches approved tokens to the existing module tree.

#### `features/`
`POST /features`, `GET /features?projectId=X&moduleId=Y`, `GET /features/:id` (joined with module_name / module_path), `PATCH /features/:id` (rename + status + ai_description updates), `DELETE /features/:id`.

#### `pages/`
`POST /pages`, `GET /pages?projectId=X` (with linked features included), `GET /pages/:id`, `PATCH /pages/:id` (tokens / name / page_type / status), `DELETE /pages/:id`. Plus `POST /pages/:id/features` to link features and `DELETE /pages/:id/features/:featureId` to unlink. **This is the endpoint the inline-edit flow PATCHes** — every `[data-tp]` blur persists tokens here.

#### `elicitation/`
The meat of the conversation flow:
- `POST /elicitation/sessions` — start a new session, returns `sessionId`.
- `POST /elicitation/sessions/:id/message` — user sends a message, AI responds. Streams the assistant's response, updates context.
- `PATCH /elicitation/sessions/:id/breakdown` — user edited the inline breakdown proposal.
- `POST /elicitation/sessions/:id/complete` — the big one:
  1. Fetch or generate the breakdown with transcript + prior summaries
  2. Sanitize
  3. Create/upsert modules (recursive), features, pages — using `(project_id, path)` for unique conflict keys (not slug, because slugs collide)
  4. **Safety net**: if `breakdown.pages` is empty but features were created, auto-seed one `form` page per feature
  5. Insert `reprocess_jobs` row with `status: pending`
  6. Kick off background work: fetch existing docs, classify which features/pages this session "touches" via `touchedByUser()`, generate docs incrementally, extract page tokens with `bypassCache: true`, regenerate summaries, write all back
  7. Return `{jobId, created: {modules, features, pages}, updated: {features, pages, featureNames, pageNames}, createdNames: {features, pages}}`
- `GET /elicitation/sessions?projectId=X` — list sessions for the conversations panel.
- `GET /elicitation/sessions/:id/messages` — message history.

#### `quiz/`
`POST /quiz/start` — generates 5 DEASV-coverage questions for a feature. `POST /quiz/answer` — fast path: maps the answer to a BRD section (purpose → Business Context, etc.), surgically appends without blocking on AI, then fire-and-forgets a polish rewrite. Previously took 10+ seconds; now 57ms. Prompt instructs ~1 in 3 questions probe purpose/why, and supports `multiSelect: true` for "which of these apply?" questions.

#### `reprocess/`
The job machinery for user-triggered regeneration:
- `POST /reprocess/feature/:id` — creates a job, kicks off bg work: updates doc with latest context, test cases, use cases, summary, confidence score; finds all pages linked to this feature and regenerates their tokens with `bypassCache: true`.
- `POST /reprocess/page/:id` — doc-first (if the page has an AI description, refresh it), then extract fresh tokens from the doc's UI/UX + Validations + Error Messages sections.
- `POST /reprocess/module/:id` — cascade reprocess every feature under the module.
- `GET /reprocess/status/:jobId` — poll single job.
- `GET /reprocess/status/by-entity/:type/:id` — latest job for an entity (for resume-on-reload).

Every step calls `setStep('feature:188 test cases')` so the frontend shows live progress.

#### `exports/`
`GET /exports/brd?projectId=X[&moduleId=Y][&pageId=Z]` — returns HTML. `GET /exports/excel?projectId=X&format=json|xlsx` — returns JSON preview or xlsx buffer. `GET /exports/mindmap?projectId=X` — interactive HTML mindmap.

#### `history/`
`GET /history?projectId=X` — all approved versions (flat list, cross-module). `PATCH /history/:id/approve` — toggle approval. Each version stores the full tokens snapshot + clean prompt + raw title/description + the module path it was auto-assigned to.

#### `prototype/`
Legacy Phase-1 endpoints: `POST /prototype/generate` (classic blank-canvas flow), `POST /prototype/regenerate` (with feedback diff). These still exist for direct prototype generation outside the elicitation flow.

#### `comments/`
`POST /comments`, `GET /comments?entityType=X&entityId=Y`, `PATCH /comments/:id/resolve`, `DELETE /comments/:id`. Threaded review on any feature/page/module. Schema is in place, UI is partial.

#### `feedback/`
User feedback on prototype quality — thumbs up/down + free-text. Feeds into prompt quality metrics over time.

#### `suggestions/`
AI-suggested next moves: "Your Login feature has 0.28 assumption risk — you should clarify the Remember Me policy." Proactive recommendations on the confidence page.

#### `share/`
`POST /share/pages/:id` — create a public share link for a prototype (unauth-readable).

#### `usage/`
`GET /usage?userId=X` — token consumption dashboard. Powered by `usage_events` inserts from `ai-client.ts`.

#### `requirements/`
Older CRUD for the pre-elicitation direct-requirement flow. Being phased out as elicitation becomes the primary path.

---

## PART B — FRONTEND (`web/src/app/`)

Angular 19 standalone components + signals throughout. No NgModules.

### B.1 `pages/` — route targets

Each is a full-screen page registered in `app.routes.ts`.

#### `pages/landing/`
Public marketing page. "Get started" → signup flow.

#### `pages/auth/`
Login + Signup forms. `auth.service.ts` stores JWT in `localStorage` as `bs_token`.

#### `pages/projects/`
Project list. Create, rename, archive. Cards with last-updated time + confidence average.

#### `pages/workspace/`
**The main screen.** Three-panel layout. Orchestrates every other component.

File: `workspace.component.ts`

Key responsibilities:
- Load `workspace/init` data on mount
- Pass init data to `modules-panel` via `loadFromInit(...)`
- Handle selection events: `onProjectSelected`, `onModuleSelected`, `onFeatureSelected`, `onPageSelected` — each sets `scopeXxxId` signals, fetches details, scopes related pages
- `applyUrlState()` — reads `?moduleId/featureId/pageId/tab` from URL and selects the right entity. Waits up to 5s for `_initData` because `ngOnInit` is async and `ngAfterViewInit` may fire first.
- `syncUrl()` — writes current selection back to URL with `replaceUrl: true` so back/forward work.
- Tab changes no longer reset selection — your current tab survives switching features.
- `@HostListener('window:message')` handles two message types:
  1. `prototype-nav` — submit on login button → navigate to dashboard page in the tree
  2. (Edit messages are handled inside `prototype-preview` directly)
- Meeting timer signals for the "Start Meeting" button.

#### `pages/confidence/`
Project-wide confidence dashboard. Shows all features sorted by FCS ascending (weakest first), with the 5-axis DEASV bars for each. Links to quizzes.

---

### B.2 `components/` — composable UI

#### `components/modules-panel/`
Left panel tree. **The navigation surface.**

Template highlights:
- Header with + (add module) and ↑ (import structure) buttons
- Inline creation input when `creatingNode() === true`
- Import panel (`<app-module-structure-input>`) for pasting a plain-text outline
- Project root node (briefcase icon, bold)
- Recursive `moduleNode` template for each module/sub-module with:
  - Chevron (toggles expand)
  - Folder icon
  - Name span — **double-click to rename** (switches to inline input, Enter saves, Esc/blur cancels)
  - Hover: + button (add child) and × button (delete module with confirm + cascade warning)
  - Red-flag badge for features < 50% FCS, green dot if all healthy
- Features under each module: chevron-less, doc icon, name (double-click to rename), 3 FCS dots + score badge, hover × (delete feature)

Component logic (`modules-panel.component.ts`):
- `tree = signal<ModuleNode[]>([])`, `pages = signal<PageNode[]>([])`
- `selectedId / selectedFeatureId / selectedPageId` — mutually exclusive selection
- `projectNodeSelected` — when the root project is clicked
- `creatingNode / newNodeName / newNodeParentId / newNodeType` — inline creation
- `renamingModuleId / renamingFeatureId / renameText` — double-click rename state
- `startRename / confirmRename / cancelRename / onRenameKeydown` — rename lifecycle, PATCHes `/modules/:id` or `/features/:id`
- `deleteModule / deleteFeature / deletePage` — confirm-then-DELETE helpers
- `findModuleById / findFeatureById / findPageById` — walk the tree for URL state resolution
- `loadFromInit(modules, features, pages, pageFeatures)` — called by workspace to populate from the single `workspace/init` call, avoiding 3 extra round-trips
- `moduleRedFlagCount(node)` — recursive count of features with FCS < 50%
- `fcsScore(feat)`, `fcsColor(score)`, `fcsDotColor(val)` — color mapping for DEASV visuals

#### `components/module-structure-input/`
The "Import structure" sub-panel. A textarea that accepts a plain-text outline:
```
1. Authentication
  1.1 Login
    Username Login
    Password Reset
```
Parses it, calls `POST /modules/parse` (via `onCommitted` event), which bulk-creates the tree.

#### `components/prototype-preview/`
**The center panel.** Owns all 5 tabs.

Template (`prototype-preview.component.html`):
- Tab strip across the top
- **Details tab** — feature detail view OR module overview view
  - Feature: h2 with **double-click rename**, FCS 5-axis bar chart with hover tooltip, doc sections rendered from markdown (with pipe-table + loose-table support), test cases / use cases tabs
  - Module: h2 with rename, aggregate confidence bar, feature list sorted by FCS
- **Prototype tab** — iframe with `srcdoc` set from `data:text/html` URL encoding
- **BRD tab** — iframe with BRD HTML, download button
- **Excel tab** — in-app table preview + download
- **Mindmap tab** — iframe with interactive mindmap

Component logic (`prototype-preview.component.ts`):
- Inputs: `tokens`, `projectId`, `scopeModuleId / scopePageId / scopeFeatureId`, `relatedPages`, `detailsModule / detailsFeature / moduleFeatures`
- Outputs: `pageClicked`, `featureClicked`, `quizRequested`, `tabChanged`, `entityRenamed` (→ workspace refreshes the tree)
- `activeTab` signal, `setTab(tab, emit=false)` — tab also controls what's loaded
- `designSystem` + `protoContext` loaded once per project, applied to every render
- `renamingDetailsFeature / renamingDetailsModule / detailsRenameText` — details tab inline rename, PATCHes and emits `entityRenamed`
- `editingPageId` cache — resolved on-demand for feature-scoped previews so edits land on the correct page
- **`onProtoMessage` (`@HostListener('window:message')`)** — receives `prototype-edit` events from the iframe:
  1. Resolves backing page id (scopePageId direct; else fetch `/pages`, filter by feature id)
  2. Clones tokens, walks path (auto-creates missing intermediates for `uiText.signupPrompt` etc.), sets value
  3. PATCHes `/pages/:id` with updated tokens
  4. Posts `prototype-edit-ack` back to the iframe so it can show "saving…" → "✓"
- **`ngOnChanges` normalizer** — when tokens first load, calls `normalizeTokens()` from the renderer. If it converted any `string` sections to `{label, role}` objects, PATCHes back so future loads are already role-tagged.
- `reprocessPrototype` — creates a reprocess job, polls status every 1.5s with 90s timeout, shows live `reprocessStep` label, reloads the affected page's tokens on completion.
- `detailsSections(aiDesc)` — splits the markdown AI description on `## ` headers, renders each as a card with sanitized HTML (supports pipe tables + multi-space/tab "loose tables" the AI sometimes emits).
- `detailsFcsScore`, `detailsFcsColor`, `detailsBarColor` — color mapping for the DEASV bars.

#### `components/elicitation-chat/`
**The right panel.** Conversation surface with session list + active conversation.

Template highlights:
- Session list header ("Conversations" + "3 sessions"), "+ New" button
- Message list:
  - User bubbles: green, right-aligned
  - Assistant bubbles: gray, left-aligned
  - **Quiz-style choices**: when assistant emits a set of options, renders radio-style pills; `multiSelect: true` uses checkboxes
  - **Bulleted content**: if ≥ 2 bullets, branches:
    - **Questions** (`?` ending majority) → Q+A cards with inline text inputs, "Send answers" button (submits non-empty answers as `Q: ...\nA: ...` pairs)
    - **Proposals** → checkbox list with "Include N selected" / "Include all" buttons
- **Breakdown proposal editor** — when the AI proposes modules+features, user can click "Adjust" to get an inline editable tree (rename / remove / add rows / save) before "Confirm and Create"
- **Job status message** — live-updating `⏳ Regenerating: <step>` card that polls `/reprocess/status/:jobId`
- Input at the bottom with send button + voice option

Component logic (`elicitation-chat.component.ts`):
- `sessions`, `activeSession`, `messages` signals
- `sending`, `completed`, `bulletSelected`, `questionAnswers` signals
- `parseBullets(content)` — extracts intro / bullets / outro from an assistant message
- `bulletsAreQuestions(bullets)` — ≥60% end with `?`
- `getAnswer / setAnswer / hasAnyAnswer / sendAnswers` — Q+A card state
- `isBulletSelected / toggleBullet / includeSelectedBullets / includeAllBullets` — proposal checkbox state
- `editingBreakdownIdx`, `renameBreakdownItem`, `removeBreakdownItem`, `addBreakdownItem`, `saveBreakdown` — inline edit of AI's proposed breakdown tree, saves via `PATCH /sessions/:id/breakdown`
- `onConfirmCreate` — calls `completeSession(sessionId)`, reads `createdNames` and `updatedNames` to show specific messages like "Created: Student Registration, Attendance Tracker" vs "Updating: Login docs + prototype regenerating (10-20s)"
- `pollJob(jobId, prefix)` — inserts or updates a `job_status` message, polls `/reprocess/status/:jobId` every 2s, replaces with final summary on done

#### `components/quiz-modal/`
Full-screen modal for DEASV confidence questions.
- 5 questions covering the 5 axes
- Radio or multi-select per question (AI decides which based on prompt)
- Progress bar + prev/next
- On finish: POSTs each answer to `/quiz/answer`, updates feature's `confidence_score` JSONB
- Emits `scoreUpdated` on success so the parent card refreshes

#### `components/version-timeline/`
Left-bottom panel below the tree. Shows history entries:
- Each version card: label, time, source tag, approved/unapproved toggle
- Approved versions auto-assign to the module tree via `/modules/auto-assign` AI call
- Clicking a version restores its tokens to the prototype preview

#### `components/requirement-input/`
Phase-1 blank-canvas input (title + description) with 1000ms debounce. Still available for direct prototype generation outside the conversation flow.

#### `components/design-settings/`
Settings modal for per-project design system:
- Primary color picker
- Font family dropdown
- Border radius slider (rounded-none / md / lg / xl / 2xl)
- Live preview with a sample button + input
- Saves to `project_tokens.design_system`, emits `designSaved` → prototype-preview reloads its design system

#### `components/api-keys-settings/`
User's OpenAI/Anthropic keys if they want to BYO. Stored encrypted in `api_keys`.

#### `components/members-panel/`
Project collaborators. Invite by email, role dropdown, remove.

#### `components/usage-panel/`
Per-user token consumption chart. Pulls from `/usage`.

#### `components/user-avatar/`
Reusable circular avatar — initials from name, color hash, optional image. Used in members panel, header, prototype context.

---

### B.3 `services/` — HTTP + state

#### `api.service.ts`
Thin wrapper around `HttpClient`. Methods: `get / post / patch / delete / put`. Every call goes through the JWT interceptor that attaches `Authorization: Bearer <bs_token>`. `url(path, params)` builds absolute URLs using `environment.url + '/api' + path`.

#### `auth.service.ts`
`login / signup / logout / me`. Stores token in `localStorage['bs_token']`. Exposes `currentUser` signal. On 401 response interceptor redirects to login.

#### `elicitation.service.ts`
All `/api/elicitation/*` calls: `startSession`, `sendMessage`, `completeSession`, `listSessions`, `getMessages`, `saveBreakdown`.

#### `prototype.service.ts`
`/api/prototype/*` calls: `generate`, `regenerate`, `autoAssign`. Used by the Phase-1 direct input flow and by the approve → auto-assign flow.

#### `export.service.ts`
`downloadBrd / downloadExcel / downloadMindmap` — builds signed URLs and triggers browser download.

---

### B.4 `renderers/` — tokens → HTML

These are pure functions, no Angular, no DI. Given `UITokens` in, return HTML out.

#### `renderers/index.ts`
The dispatcher. `renderTokens(tokens, designSystem, protoContext)`:
1. Merges design system defaults
2. If `ctx.currentUser`, sets `design.avatarText` so sidebar shows the right initials
3. Handles empty state (`page_type === 'empty'` or no meaningful content)
4. Calls `renderDynamic(tokens, design, ctx)`
5. Appends `prototypeScripts()` — the `<script>` block that handles form interactivity + inline edit

#### `renderers/dynamic.renderer.ts`
The heart. See Part A of the mental-model doc for the full explanation. Briefly:

- `renderDynamic(t, ds, ctx)` — picks layout via `inferLayout(t)`, builds body via `renderBody`, wraps via `wrapCentered` / `wrapSidebar` / `wrapFullPage`.
- `renderBody` — conditional blocks: header bar → stats grid → toolbar → form block → data table → section cards → aux link bundle.
- `renderHeaderBar` — h1 with `data-tp="intent"` + action buttons with `data-tp="actions[i]"`, `whitespace-nowrap`, wraps instead of overflowing.
- `renderToolbar` — search + filters button if either is truthy.
- `renderFormBlock` — inputs (with `data-tp="fields[i].name"` on labels), checkboxes below, inline Forgot link, primary button. Secondary action links (Forgot / Register) are classified via `SECONDARY_RE` and rendered inline in the primary flow.
- `normalizeSection` + `inferSectionRole` + **`normalizeTokens`** — the role-tagging layer. Converts legacy bare-string sections to `{label, role}` objects, infers role from original label text. This runs once when tokens first load and persists back to DB so subsequent renders never re-infer.
- `renderAuxLinks` — role-driven: signup prompt (with `data-tp="uiText.signupPrompt"`), forgot link, remaining aux links, terms disclaimer (`uiText.termsPrefix / termsSuffix`). Clean typographic hierarchy with border-top separator.
- `renderEmptyState` — friendly "Nothing to preview yet" placeholder.

Every heading, label, button, nav item, stat, section name, and `uiText.*` key renders as a `data-tp`-tagged node — contenteditable scaffolding applies uniformly.

#### `renderers/components.renderer.ts`
Reusable atoms consumed by the dynamic renderer:
- `DEFAULT_DESIGN` — the design system fallback (green primary, rounded-lg, Inter font).
- `DesignSystem` type, `PrototypeContext` type.
- `dsBgGradient / dsBorderAccent / dsCheckboxColor / dsColorName / dsPrimaryText` — helpers for color-consistent Tailwind classes.
- `renderAvatar(name, ds, size)` — circular initials avatar.
- `renderButton / renderButtonGroup` — primary/secondary/danger variants, optional dropdown.
- `renderStatusBadge / renderRoleBadge` — colored pill badges.
- `renderDataTable(columns, rowCount, ds, entity)` — seeded realistic data (not "Lorem Ipsum") — names like Akash Sadavarte, Shubhangi Mathur, etc., with roles and statuses appropriate to the entity.
- `renderStatCard(label, value, trend, ds, labelPath?, valuePath?)` — dashboard stat with optional `data-tp` paths for editing.
- `renderFormField(name, type, placeholder, ds, path?)` — text / email / password / date / select / checkbox / file / textarea variants, with `data-tp` on the label.
- `renderSectionCard(title, content, ds, path?)` — boxed card for named sections with `data-tp` on the title.
- `renderActivityList(ds)` — realistic-looking recent activity list (named users, believable actions, relative timestamps).

#### `renderers/prototype-scripts.ts`
The script block embedded in the iframe. Handles:
- **Form validation** — on blur, required / email / password checks with inline red error messages.
- **Table sorting** — click any `<th>` to sort the tbody ascending/descending, with `▲/▼` indicator.
- **Search filtering** — live filter table rows by matching any text.
- **Password toggle** — eye icon switches `type="password"` ↔ `type="text"`.
- **Submit simulation** — on Login/Submit/Save/Register/Sign Up, runs validation, shows `✓ Success!`, then for login/signup posts `{type:'prototype-nav', targetType:'dashboard'}` to parent.
- **Select population** — auto-fills empty selects with contextual options (country / role / status / type).
- **Inline text editing** — this is the big piece:
  1. Injects a `<style>` block: `[data-tp]` gets a green outline on hover (`box-shadow: 0 0 0 1px rgba(34,197,94,.45)`) and a stronger outline on focus. No background tint, so the outline works over solid-colored buttons without washing them out.
  2. Makes every `[data-tp]` node `contenteditable="true"`. Remembers its original text.
  3. On Enter: blurs to commit. On Escape: reverts to original and blurs.
  4. On blur: if the text changed, posts `{type:'prototype-edit', path, value}` to parent, sets `data-saving` attribute (shows "saving…").
  5. Listens for `prototype-edit-ack` from parent: clears `data-saving`, briefly sets `data-saved` (shows "✓" for 1.2s).

---

### B.5 `models/`

#### `models/ui-tokens.model.ts`
The core token contract. `UITokens` has:
- `page_type` (dashboard / form / list / login / detail / landing / settings / empty)
- `layout` (sidebar-main / centered / full-page)
- `intent` (page heading)
- `entity` (brand / app name)
- `navigation: string[]` (nav items)
- `sections: Array<string | UISection>` (legacy strings OR `{label, role}`)
- `actions: string[]` (button labels)
- `fields: UIField[]` (`{name, type}`)
- `stats: UIStat[]` (`{label, value}`)
- `search / filters: boolean`
- `uiText?: Record<string, string>` (configurable micro-copy: `signupPrompt`, `termsPrefix`, `termsSuffix`, `noItems`, etc.)
- `placeholders?: Record<string, string>`
- `SectionRole` = `content | activity | signup | forgot | terms | chrome | link` — persisted, not re-inferred from label text.

---

### B.6 App shell

#### `app.component.ts` + `app.component.html`
Root component. Thin — just `<router-outlet/>` + a global toast container.

#### `app.routes.ts`
Standalone component routes. `/` → landing, `/login`, `/signup`, `/projects`, `/projects/:id` (workspace), `/projects/:id/confidence`. Guards: unauthenticated users get bounced to `/login`.

#### `environments/environment.ts`
`url` — absolute base of the API. Dev: `http://localhost:3000`. Prod: same-origin.

---

## PART C — DATABASE

### C.1 Core tree tables
- `projects` — id, name, owner_id
- `project_members` — role-based sharing (admin / editor / viewer)
- `modules` — recursive self-ref (parent_id, depth, path). `(project_id, path)` is unique.
- `features` — belongs to a module. Has `ai_description` (the 15-section markdown), `summary`, `confidence_score` JSONB, `test_cases`, `use_cases`, `pm_status`.
- `pages` — belongs to a project. Has `tokens` JSONB (the UITokens), `ai_description` (the markdown), `page_type`, `status`.
- `page_features` — many-to-many link table.

### C.2 Caching
- `prompt_cache` — raw input hash → clean English prompt
- `token_cache` — clean prompt hash → UITokens (with pg_trgm fuzzy index, version column, invalidation flag)

### C.3 Conversation
- `elicitation_sessions` — id, project_id, user_id, status, summary (for cross-session context), context_json (extracted entities), breakdown_json (the last proposed breakdown)
- `elicitation_messages` — session_id, role (user/assistant), content, type (text/options/bullets), options_json, created_at

### C.4 Confidence
- `quiz_sessions` — session_id, feature_id, answers_json, completed
- Quiz answers update `features.confidence_score.prototypeValidation` and `elicitationDepth`.

### C.5 Jobs
- `reprocess_jobs` — id, project_id, entity_type, entity_id, user_id, status, step, error, created_at, started_at, finished_at. Polled by FE for live progress.

### C.6 Misc
- `history` — approved version snapshots (tokens JSONB, clean_prompt, raw_title, raw_description, module_path JSONB).
- `regeneration_log` — old/new token diffs per regeneration for analytics.
- `comments` — entity_type, entity_id, user_id, content, resolved.
- `project_tokens` — design_system JSONB + prototype_context JSONB.
- `local_dictionary` — self-improving word mappings.
- `usage_events` — per-call AI token spend per user.
- `api_keys` — user BYO keys encrypted.

---

## PART D — END-TO-END FLOWS

### D.1 Start a new project from scratch
1. User: "I want to develop a school management system. Plan modules + submodules + features."
2. FE: `POST /elicitation/sessions` → `sessionId`
3. FE: `POST /elicitation/sessions/:id/message` with user's text
4. BE: `streamline` cleans the input → `generateQuestion` asks clarifying questions
5. User answers (or clicks "Include all" on proposals)
6. User clicks "Confirm and Create"
7. FE: `POST /elicitation/sessions/:id/complete`
8. BE: `generateBreakdown` returns `{modules: [...], pages: [...]}`
9. BE: `sanitizeBreakdown` strips non-features
10. BE: safety-net ensures pages exist (one form page per feature if AI returned none)
11. BE: upserts modules, features, page_features links; creates `reprocess_jobs` row
12. BE: background work: `touchedByUser()` → scope → generate docs → extract tokens (bypass cache) → update confidence scores → mark job done
13. FE: polls job status, shows live "⏳ Regenerating: page:Create Exam tokens" updates, refreshes on done

### D.2 User clicks a feature → sees its prototype
1. FE: `onFeatureSelected(feat)` → sets `scopeFeatureId`, fetches full feature via `/features/:id`
2. `syncUrl()` writes `?featureId=X` to address bar
3. `showRelatedPages([feat.id])` — if feature links to exactly one page and that page has tokens, `this.tokens.set(...)`
4. `prototype-preview` receives `[tokens]` input → `ngOnChanges` fires
5. `normalizeTokens` upgrades string sections to `{label, role}` if needed, PATCHes back
6. `renderTokens` produces HTML → wrapped in `<!DOCTYPE html>` → data URL → iframe `srcdoc`

### D.3 User edits prototype text inline
1. User hovers over "Login" button → sees green outline
2. Clicks → button becomes contenteditable, cursor lands inside
3. Types "Sign In" → presses Enter
4. Iframe script posts `{type:'prototype-edit', path:'actions[0]', value:'Sign In'}` to parent
5. `prototype-preview.onProtoMessage` resolves the backing page id (scopePageId or fetch + filter by feature)
6. Clones tokens, `setByPath(next, 'actions[0]', 'Sign In')` — auto-creates intermediates for `uiText.*` paths
7. `PATCH /pages/:id` with `{tokens: next}`
8. Posts `prototype-edit-ack` back to iframe
9. Iframe shows "✓" for 1.2s, then normal

### D.4 User double-clicks feature name in the tree → renames it
1. `(dblclick)` on span → `startRename('feature', feat.id, feat.name)` → `renamingFeatureId` set
2. Template swaps span for `<input autofocus>` bound to `renameText`
3. User types, presses Enter → `confirmRename('feature', id)`
4. `PATCH /features/:id` with `{name}`
5. `this.refresh()` → `fetchTree()` + `fetchPages()`
6. Tree re-renders with the new name

### D.5 User exports BRD
1. User clicks Download on BRD tab
2. FE opens `${apiBase}/exports/brd?projectId=X&token=...` in new tab
3. BE: walks modules → features → pages, assembles 15-section HTML per feature, stitches exec summary + appendix
4. Returns `text/html` response → browser renders or saves

---

## PART E — WHAT'S OPINIONATED ABOUT THIS DESIGN

1. **Backend returns pure semantic JSON; frontend renders.** No HTML in API responses (except intentional exports). This is why the dynamic renderer works — there's one source of truth.
2. **Role > text.** Every routing decision (section → card vs footer link; feature vs non-feature; page type inference) uses a persisted tag, not regex-on-label-text. Makes the system edit-stable.
3. **Inline everything.** Rename in place, delete in place, edit prototype in place. No modals for small operations.
4. **Background jobs, live steps.** Regeneration is slow (AI is slow). The user always sees what's happening. Jobs are a first-class entity.
5. **Conversation is source, tree is store, prototype is feedback loop.** Prior conversations inform future ones via summaries. Corrections propagate. Vocabulary is preserved.
6. **Two-level cache + fuzzy match + bypass on fresh work.** Fast when possible, correct when it matters.
7. **Multilingual input, English storage.** Users speak how they speak; the system stores canonical English so docs and exports are professional.

---

## PART F — THE ONE-PAGE MENTAL MODEL

> **Convert messy conversation → typed tree of modules/features/pages → 15-section doc per feature → role-tagged UITokens per page → editable live prototype with click-to-rename everywhere → PATCH-on-blur persistence → background jobs with live steps for every regeneration → BRD/Excel/Mindmap exports for stakeholders. Role > text for every routing decision, so renames never flip the UI. Conversation summaries feed future conversations so corrections stick. Vocabulary is preserved end-to-end.**
