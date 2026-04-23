# Flow — AI Data Storage Plan (what we send to AI, what we get back, what we store)

**The load-bearing rule**: backend always returns **JSON**. The frontend renders **everything** — prototype HTML, BRD pages, Excel sheets, mindmaps — from that JSON. **AI is never used to render HTML.** AI is used to *extract*, *transform*, and *propose typed data* that the JSON contract is built from.

---

## 1. The Invariant

| Layer | Returns | Renders |
|-------|---------|---------|
| Backend (Hono) | **JSON only** (typed via Zod / OpenAPI) | nothing |
| AI (via `invoke_ai()`) | **typed JSON artifacts** (tokens, sections, narratives, suggestions) | nothing |
| Frontend (Angular) | UI | **everything** — DOM, prototype iframes, BRD, Excel, mindmap |

No code path in the backend produces HTML. No AI prompt produces final HTML. **No AI call exists for "generate the prototype HTML."**

The prototype is rendered by the FE from a JSON `pageTokens` object using a **library of pre-built components × variations** (see §3).

---

## 2. What gets stored in the DB (the JSON shape per feature/page)

Each feature and page accumulates several typed projections, all stored as normalized rows + reassembled into JSON for the FE:

```jsonc
// per feature
{
  "feature": { id, name, moduleId, status, ... },
  "structuredDoc": {
    "sections": [
      { "key": "overview",       "content": "...", "source": "user|ai|default" },
      { "key": "validations",    "content": "...", "source": "..." },
      { "key": "edge_cases",     "content": "...", "source": "..." },
      ...                        // 15+ BRD-style section keys
    ]
  },
  "rawInputs":      [ ... ],     // text/voice/file/quiz inputs
  "tokens":         [ ... ],     // typed requirement tokens
  "narratives":     [ ... ],     // free-text narratives
  "decisions":      [ ... ],     // from Decision Log, scoped to this feature
  "linkedPages":    [ ... ],
  "confidence":     { D, E, A, S, V, overall }
}

// per page (the "prototype" payload)
{
  "page": { id, name, pageType, layout },
  "pageConfig":     { ... },     // user-tuned per-page knobs (theme, density, whitespace, etc.)
  "blocks": [
    {
      "id":        "uuid",
      "kind":      "form" | "table" | "stats" | "section" | "header" | "aux",
      "componentId": "form.standard",        // pick from component library (see §3)
      "variation":   "two-column-with-aside",
      "props":     { ... },                  // component-specific props
      "fields":    [ ... ],                  // typed fields
      "roleScope": [ "Admin", "Teacher" ],
      "seedData":  { ... }                   // see §4
    }
  ]
}

// project-level config (rendering style for all artifacts)
{
  "renderConfig": {
    "prototype": { theme, density, brand, ... },
    "brd":       { sectionsOrder, headerStyle, includeMetaTable, ... },
    "excel":     { sheets, columnsPerSheet, includeFormulas, ... },
    "mindmap":   { layout, depth, edgeStyle, ... }
  }
}
```

---

## 3. Component library + variations (no AI for layout)

A first-class registry of FE components. Each `block.componentId` points to a known FE component; `variation` picks one of its layouts. **AI never invents components or variations** — it only picks from the registry.

```jsonc
componentLibrary = [
  {
    "componentId": "form.standard",
    "label": "Standard Form",
    "variations": ["single-column", "two-column", "two-column-with-aside", "stepper"],
    "props": { /* JSON Schema */ }
  },
  {
    "componentId": "table.crud",
    "label": "CRUD Table",
    "variations": ["compact", "card-rows", "with-filters", "split-detail"],
    "props": { ... }
  },
  {
    "componentId": "stats.kpi-row",
    "variations": ["3-up", "4-up", "with-sparkline", "with-trend"]
  },
  ...
]
```

The registry is **shipped with the FE**, and a mirror lives in the DB so the BE can validate `block.componentId` + `variation` on every event.

The user can:
- Swap a block's `componentId` (e.g. switch from `form.standard` → `form.wizard`)
- Switch the `variation`
- Tune `props`
- Override `seedData`

Each of these is an event (see §6) and gets captured as a **decision scoped to the feature/page**.

---

## 4. Seed data — assembled from DB columns, sent as JSON

Seed data is **what the prototype shows when running** — sample users, sample courses, sample form values. Assembled at request time from DB columns:

```ts
async function assemble_page_seed_data(pageId) {
  const blocks      = await load_page_blocks(pageId);
  const overrides   = await load_seed_overrides(pageId);     // user-edited values stored separately
  const defaults    = await derive_default_seed(blocks);     // generated once, stored
  const merged      = merge_overrides_over_defaults(defaults, overrides);
  return assemble_seed_response(merged);
}
```

- **Defaults** are generated once (via AI extraction from the StructuredDoc; or from the design system; or hand-written) and persisted in `page_seed_defaults`.
- **Overrides** are user edits — every override is an event (`seed.set`) → also captured in the Decision Log scoped to the page.
- The FE receives the merged JSON and uses it as the prototype's localStorage / IndexedDB seed.

**Persistence loop:** next time anyone loads the prototype, the merged seed reflects the latest overrides. Reverting a seed override is itself an event.

---

## 5. Context preparation — the `prepare_context()` stage

**Before any AI call, context is assembled by a dedicated function — not by the caller, not inline inside `invoke_ai()`.** Each AI `kind` declares exactly which slices of project state it needs. No grab-everything; no "pass whole Context Bag and hope the Selector trims."

### 5.1 Pipeline position

```
caller (projector, worker, or /api/ai/invoke)
        │
        ▼
  prepare_context(kind, args)   ◄── THIS STAGE
        │  (load only what the recipe declares;
        │   rank relevance-items; enforce budget)
        ▼
  invoke_ai(kind, prompt, ctx)
        │
        ▼
  provider call  →  typed JSON response (Zod-validated)
```

### 5.2 The function

```ts
// be/src/ai/prepare-context.ts
async function prepare_context(kind: AiKind, args: PrepareContextArgs): Promise<PreparedContext> {
  const recipe      = load_context_recipe(kind);               // per-kind declaration (§5.3)
  const required    = await load_required_slices(recipe.required, args);
  const candidates  = await load_candidate_slices(recipe.selectedByRelevance, args);
  const ranked      = rank_candidates(candidates, args.hint, args.scope);
  const pinned      = apply_context_hint(ranked, args.contextHint);     // user mustInclude / exclude
  const budgetLeft  = recipe.budgetTokens - token_count(required);
  const chosen      = pick_until_budget(pinned, budgetLeft);
  const trimmed     = trim_long_items(chosen);
  const prepared    = assemble_prepared_context(recipe.shape, required, trimmed);
  await record_context_preparation_log(kind, args, recipe, required, chosen, prepared);
  return prepared;
}
```

Every line is a named step (functional code style rule). Each helper is independently testable.

### 5.3 Context recipes (per kind — the load-bearing declaration)

Every AI `kind` has a recipe row in `ai_context_recipes` (seeded in code, editable via UI like prompts). Recipe fields:

```jsonc
{
  "kind":                   "respond",
  "required":               ["project.brief", "project.roles",
                             "session.messages.lastN:20",
                             "actor.authorityRank"],
  "selectedByRelevance":    ["project.docs.chunks",
                             "project.decisions.activeInScope",
                             "glossary.termsTouchedInScope",
                             "session.attachments.inScope",
                             "session.messages.olderSummaries"],
  "neverInclude":           ["ai_call_log", "audit_feed", "other_projects.*"],
  "budgetTokens":           12000,
  "shape":                  "ContextShapeRespond"     // Zod schema the AI prompt expects
}
```

### 5.4 Recipe catalog (V1)

| Kind | Required slices | Selected by relevance | Budget |
|------|-----------------|-----------------------|--------|
| `document.parse` | `uploadedFile.content`, `project.domain` | — | 30k |
| `respond` | `project.brief`, `project.roles`, `session.messages.lastN:20`, `actor.authorityRank` | `project.docs.chunks`, `project.decisions.activeInScope`, `glossary.touches`, `session.attachments.inScope`, `session.messages.olderSummaries` | 12k |
| `quiz.generate` | `session.messages.lastN:30`, `project.roles`, `session.openQuestions` | `project.decisions.activeInScope` | 8k |
| `decisions.extract` | `session.transcript.full` | `session.attachments.referenced`, `session.quizAnswers` | 10k |
| `skeleton.suggest` | `project.brief`, `project.roles`, `project.members`, `project.docs.summaries`, `project.decisions.allActive` | `project.docs.topKChunks` (RAG over full corpus), `glossary.project` | 20k |
| `doc.section.write` | `feature.structuredDoc`, `sectionKey`, `hint`, `project.roles`, `project.glossary.termsForFeature` | `feature.decisions`, `feature.rawInputs.top3` | 6k |
| `tokens.extract` | `feature.structuredDoc`, `project.roles`, `project.designSystem`, `componentLibrary.registry` | `glossary.project`, `feature.decisions` | 15k |
| `tokens.refine` | `page.currentBlocks`, `feedback`, `componentLibrary.registry` | `feature.structuredDoc`, `feature.decisions` | 8k |
| `seed.defaults` | `page.blocks`, `feature.structuredDoc`, `project.glossary.termsForPage` | — | 6k |
| `capability.narrative` | `role`, `entity`, `capability`, `project.brief` | — | 2k |
| `decision.conflict.detect` | `triggerEvent`, `currentActor.authorityRank`, `project.decisions.activeInSameEntityScope` | `project.decisions.activeInRelatedScope` | 5k |
| `decision.suggest` | `sourceMessageOrComment`, `session.messages.lastN:5` (or comment thread) | `project.decisions.recentSimilar` | 3k |
| `glossary.canonicalize` | `newTerm`, `project.glossary.allTerms` | — | 1k |
| `cascade.analyze` | `triggerEvent`, `provenance.graphForAffectedEntities` | — | 5k |
| `export.structure` | `project.structuredDocs`, `project.decisions.active`, `project.renderConfig` | — | 20k |

### 5.5 Why recipes beat a generic Selector

- **Predictable cost.** Per-kind budget, not a global knob.
- **Testable.** Each recipe is a data row — snapshot tests can assert "the `respond` recipe loads these 5 slices and no more."
- **Auditable.** Every call writes `context_preparation_log` row naming the recipe version used + what it loaded + why each candidate was picked/skipped.
- **Tunable without code change.** Recipe templates can be edited via an admin UI (like `ai_prompts`); versioned.
- **Prevents silent leaks.** `neverInclude` is a hard block — if someone extends a slice and accidentally pulls `other_projects.*`, the recipe validator rejects it.

### 5.6 Tables

```sql
ai_context_recipes (
  kind              text PK,
  version           int,
  required_json     jsonb,
  relevance_json    jsonb,
  never_include_json jsonb,
  budget_tokens     int,
  shape_ref         text,              -- name of Zod schema
  updated_by        uuid,
  updated_at        timestamptz
)

ai_context_recipe_versions (
  id, kind, version, required_json, relevance_json, never_include_json,
  budget_tokens, shape_ref, created_by, created_at
)

context_preparation_log (
  id                uuid PK,
  ai_call_id        uuid,              -- FK to ai_call_log (nullable — also logged for dry-run)
  kind              text,
  recipe_version    int,
  required_loaded   jsonb,             -- { slice: tokens }
  candidates_ranked jsonb,             -- full ranking with scores
  chosen            jsonb,             -- items included
  skipped           jsonb,             -- items dropped with reason (budget / neverInclude / not-relevant)
  budget_tokens     int,
  used_tokens       int,
  trace_id          uuid,
  created_at        timestamptz
)
```

### 5.7 Events

| Event | Payload | Purpose |
|-------|---------|---------|
| `ai-context-recipe.update` | `{ kind, required, relevance, neverInclude, budgetTokens, shapeRef }` | Edit a recipe live; versioned |
| `ai-context-recipe.test-run` | `{ kind, version, sampleArgs }` | Validate a recipe against a sample without touching production |
| `ai.context.prepared` | `{ preparationLogId, kind, recipeVersion, usedTokens, sliceSummary, traceId }` | System-emitted after every `prepare_context()` call |

### 5.8 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ai-context-recipes` | List all recipes |
| GET | `/api/ai-context-recipes/:kind` | Latest recipe for a kind |
| GET | `/api/ai-context-recipes/:kind/versions` | History |
| GET | `/api/ai/context-preparations/:id` | Single preparation log row |
| GET | `/api/projects/:id/ai/context-preparations` | Filterable list |

### 5.9 Interaction with `invoke_ai()`

```ts
async function invoke_ai(args: InvokeAiArgs) {
  const prepared  = await prepare_context(args.kind, args);            // §5.2
  const prompt    = await load_prompt_template(args.kind);
  const provider  = pick_provider(args, prompt);
  const result    = await call_provider(provider, prompt, prepared, args.inputs);
  const callId    = await record_ai_call_log(args, prompt, prepared, provider, result);
  return assemble_result(callId, result, prepared);
}
```

`prepare_context()` is **always called** before `invoke_ai()` calls the provider. The two functions live in sibling files (`be/src/ai/prepare-context.ts` and `be/src/ai/invoke.ts`) and share the `PreparedContext` type.

---

## 6. What we send to AI and what we get back (per stage)

Every AI call goes through `invoke_ai()` ([token-estimate.md §1](./token-estimate.md)), which first calls `prepare_context(kind, args)` (see §5). The context column below names the **recipe** used — not a raw list of everything in the DB.

| # | Stage / Trigger | `kind` → recipe | Input (non-context) | We RECEIVE (typed JSON) | Stored in |
|---|-----------------|-----------------|---------------------|--------------------------|-----------|
| 1 | `project.document.upload` | `document.parse` | uploaded file | `{ summary, chunks, extractedFacts }` | `project_documents.parsed_*` + `embeddings` |
| 2 | `ai.respond.request` (chat) | `respond` | scope, hint | `{ content, artifacts? }` | `messages` row |
| 3 | `quiz.suggest` | `quiz.generate` | session id | `{ questions[] }` | `quiz_questions` |
| 4 | `session.end` | `decisions.extract` | session id | `{ decisions[] }` | `decision.capture` × N |
| 5 | `init.skeleton.suggest` | `skeleton.suggest` | hint, basedOnRevisionId? | `{ tree, rationalePerNode }` | `project_init_skeleton_revisions` |
| 6 | `doc.regenerate` | `doc.section.write` | featureId, sectionKey, hint | `{ content }` | `feature_structured_doc_sections` (skips `source: 'user'`) |
| 7 | "Build prototype tokens" | `tokens.extract` | featureId, pageId | `{ blocks: [{ componentId, variation, props, fields, roleScope }] }` ← picks from library | `page_blocks` + `block_fields` + `block_sections` |
| 8 | `prototype.regenerate { feedback }` | `tokens.refine` | pageId, feedback | `{ blocks }` (delta or replace) | `page_blocks` |
| 9 | "Generate seed defaults" | `seed.defaults` | pageId | `{ seedDefaults }` | `page_seed_defaults.json` |
| 10 | `capability.narrative.regenerate` | `capability.narrative` | cellId | `{ narrative }` | `capability_cells.narrative` (only when `source: 'ai'`) |
| 11 | `decision-conflict-detector` worker | `decision.conflict.detect` | triggerEventId | `{ conflicts[] }` | `decision.conflict.detected` system event |
| 12 | AI-proactive suggest in chat / on comment | `decision.suggest` | messageId or commentId | `{ suggested[] }` | `decision.suggest` system event |
| 13 | Glossary auto-capture | `glossary.canonicalize` | newTerm | `{ canonical, userWord, scope }` | `glossary.term.add` event |
| 14 | Cascade analysis | `cascade.analyze` | triggerEventId | `{ suggestions[] }` | `cascade.suggest` system event |
| 15 | Voice transcribe | (Whisper — doesn't use `prepare_context`) | audio | `{ transcript, language, confidence }` | `messages.content` |
| 16 | Export structuring | `export.structure` | exportId | `{ sections, sheetSpecs, mindmapSpec }` | `exports.structured_payload` |

> **Stages that do NOT exist (never call AI):**
> - "Generate prototype HTML" — FE renders from `pageTokens` JSON only.
> - "Render BRD HTML" — FE renders from the structured export payload.
> - "Render Excel" — FE constructs the workbook client-side from `sheetSpecs`.
> - "Render Mindmap" — FE renders SVG from `mindmapSpec`.
> - "Render any UI element from raw text" — every block has `componentId + variation` picked from the registry.

---

## 7. Configuration panels (separate UI surfaces; first-class events)

The user has dedicated panels to tune **how things render** — these store JSON config rows. Every change is an event; every change is a decision scoped to the relevant entity.

| Panel | Configures | Events | Stored in |
|-------|------------|--------|-----------|
| Prototype Component Picker (per block) | `componentId`, `variation`, `props` | `block.component.set { blockId, componentId, variation, props }` | `page_blocks` |
| Prototype Page Config | theme, density, brand, role-switcher default | `page.config.set { pageId, config }` | `pages.config_json` |
| Seed Data Editor (per block / per field) | overrides on default seed | `seed.set { pageId, blockId?, fieldPath, value }` / `seed.reset { pageId, blockId?, fieldPath }` | `page_seed_overrides` |
| BRD Format Config | sections order, header style, meta table inclusion, page breaks | `brd.config.set { config }` | `project_render_config.brd_json` |
| Excel Format Config | sheet list, columns per sheet, formulas, freeze panes | `excel.config.set { config }` | `project_render_config.excel_json` |
| Mindmap Format Config | layout, depth, edge style | `mindmap.config.set { config }` | `project_render_config.mindmap_json` |
| Component Library Tweaks (admin) | enable/disable variations, set defaults | `component-library.variation.set { componentId, variation, enabled, defaultProps }` | `component_library_overrides` |

Every one of these events:
- Goes through the single write surface `POST /api/events`.
- Is logged in the project event log with `idempotencyKey`, `sequenceNo`, `traceId`, `actor`, `authorityRank`.
- **Is captured as a `decision.capture`** scoped to the relevant entity (feature/page/project) so the Decision Log carries it.
- May trigger conflict detection if it contradicts an active decision (severity-tiered prompt).

**Persistence loop**: after the event commits, the `page_blocks` / `pages.config_json` / etc. tables update; next time anyone loads `GET /api/pages/:id` (or the workspace boot's prototype payload), they see the new version.

---

## 8. Read APIs that return the FE-renderable JSON

| Read | Returns | Used by |
|------|---------|---------|
| `GET /api/projects/:id/init` | workspace bootstrap (see [workspace-init.md](./workspace-init.md)) | Workspace boot |
| `GET /api/features/:id` | feature + linked pages | Feature open |
| `GET /api/features/:id/doc` | StructuredDoc JSON | BRD viewer / detail panel |
| `GET /api/pages/:id` | page + blocks + fields + seed (merged defaults+overrides) + page config | Prototype viewer |
| `GET /api/pages/:id/seed` | seed JSON only (defaults+overrides) | Prototype state hydration |
| `GET /api/projects/:id/render-config` | BRD/Excel/Mindmap config JSONs | Configuration panels + exports |
| `GET /api/component-library` | full component+variations registry (cached on FE) | Block component picker |
| `GET /api/component-library/overrides` | per-project enable/disable + default-props overrides | Same |
| `GET /api/exports/:id` | structured payload (FE renders the actual file) — except for "share-link" which returns a token | BRD/Excel/Mindmap render |

---

## 9. Auditability per feature/page (everything traces to a decision)

For any feature/page, you can ask:
- *"Why does this block use the `two-column-with-aside` variation?"*
  → look at `decision-log?featureId=<id>&filter=block.component.set` → see the `decision.capture` row + the actor + the `traceId` + linked AI call (if AI proposed) in `ai_call_log`.
- *"Why is this seed value 'Akash' and not 'John'?"*
  → look at `decision-log?pageId=<id>&filter=seed.set` → audit chain.
- *"Why is the BRD section order this?"*
  → look at `decision-log?projectId=<id>&filter=brd.config.set`.

Every change is an event. Every event optionally captures a decision. The Decision Log + AI Call Log together explain the entire current state of any rendered artifact.

---

## 10. Cost & latency consequence of this principle

- Prototype loads are **zero AI calls** — pure DB read + FE render from JSON.
- Tuning a component or seed value is **zero AI calls** — typed events update DB.
- AI is invoked only when the user explicitly asks for *new content* (regenerate doc section, refine prototype tokens, suggest skeleton) or for *background analysis* (conflict detection, cascade, decision suggestions).
- This keeps `/api/projects/:id/usage` predictable and lets `cost-estimate` actually mean something.

---

## 11. Cross-cutting reminder

| Rule | Where enforced |
|------|----------------|
| BE never returns HTML | Hono response middleware refuses non-JSON content types |
| AI never returns HTML | `invoke_ai()` validates output via Zod against typed schemas per `kind`; HTML responses fail validation |
| Every block is a registered component | Event handler validates `componentId + variation` against `component_library` table; invalid → 422 |
| Every seed override is an event | `seed.set` is the only mutation path; raw DB writes forbidden |
| Every render-config change is a decision | `*.config.set` events fan out to `decision.capture` |

---

## 12. Sidecar references

| Topic | Doc |
|-------|-----|
| AI call helper, logging, single entry point | [`token-estimate.md`](./token-estimate.md) + [`api/api-catalog.md` §H](../api/api-catalog.md#h-ai-communication) |
| Decision Log + voting + conflict detection | [`decision-log.md`](./decision-log.md) |
| Workspace action surface | [`workspace-init.md`](./workspace-init.md) |
| Stack & rendering principle source | [`../architecture/00-stack-decisions.md`](../architecture/00-stack-decisions.md) + project `CLAUDE.md` |
