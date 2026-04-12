# Graph Report - .  (2026-04-12)

## Corpus Check
- Corpus is ~16,745 words - fits in a single context window. You may not need a graph.

## Summary
- 297 nodes · 333 edges · 54 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_AI & Token Processing|AI & Token Processing]]
- [[_COMMUNITY_Product Vision & Roadmap|Product Vision & Roadmap]]
- [[_COMMUNITY_API Route Layer|API Route Layer]]
- [[_COMMUNITY_Module Structure Input|Module Structure Input]]
- [[_COMMUNITY_Backend Renderer Engine|Backend Renderer Engine]]
- [[_COMMUNITY_Angular UI Components|Angular UI Components]]
- [[_COMMUNITY_Core Infrastructure|Core Infrastructure]]
- [[_COMMUNITY_Workspace Page|Workspace Page]]
- [[_COMMUNITY_Modules Panel|Modules Panel]]
- [[_COMMUNITY_Requirement Input|Requirement Input]]
- [[_COMMUNITY_Self-Improving Dictionary|Self-Improving Dictionary]]
- [[_COMMUNITY_Data Layer & Services|Data Layer & Services]]
- [[_COMMUNITY_Prototype Preview|Prototype Preview]]
- [[_COMMUNITY_Projects Page|Projects Page]]
- [[_COMMUNITY_HTTP API Client|HTTP API Client]]
- [[_COMMUNITY_Prototype Service|Prototype Service]]
- [[_COMMUNITY_UITokens Rendering Contract|UITokens Rendering Contract]]
- [[_COMMUNITY_Shared Renderer Utilities|Shared Renderer Utilities]]
- [[_COMMUNITY_App Bootstrap & Routing|App Bootstrap & Routing]]
- [[_COMMUNITY_Landing Page|Landing Page]]
- [[_COMMUNITY_Seed Script|Seed Script]]
- [[_COMMUNITY_DB Pool & Migrations|DB Pool & Migrations]]
- [[_COMMUNITY_Logging Layer|Logging Layer]]
- [[_COMMUNITY_Fuzzy Match & AI Guardrails|Fuzzy Match & AI Guardrails]]
- [[_COMMUNITY_Prototyping Rationale|Prototyping Rationale]]
- [[_COMMUNITY_App Root Component|App Root Component]]
- [[_COMMUNITY_Form Renderer|Form Renderer]]
- [[_COMMUNITY_Dashboard Renderer|Dashboard Renderer]]
- [[_COMMUNITY_Frontend Renderer Index|Frontend Renderer Index]]
- [[_COMMUNITY_Login Renderer|Login Renderer]]
- [[_COMMUNITY_Community 30 (list_renderer_renderlist)|Community 30 (list_renderer_renderlist)]]
- [[_COMMUNITY_Community 31 (version_timeline_component_versiontimelinecomponent)|Community 31 (version_timeline_component_versiontimelinecomponent)]]
- [[_COMMUNITY_Community 32 (batch_FLUSH_MS)|Community 32 (batch_FLUSH_MS)]]
- [[_COMMUNITY_Community 33 (projects_route)|Community 33 (projects_route)]]
- [[_COMMUNITY_Community 34 (claudemd_butterstack_project)|Community 34 (claudemd_butterstack_project)]]
- [[_COMMUNITY_Community 35 (claudemd_phase1_ideation)|Community 35 (claudemd_phase1_ideation)]]
- [[_COMMUNITY_Community 36 (web_src_main_ts)|Community 36 (web_src_main_ts)]]
- [[_COMMUNITY_Community 37 (web_src_app_app_spec_ts)|Community 37 (web_src_app_app_spec_ts)]]
- [[_COMMUNITY_Community 38 (web_src_app_app_routes_ts)|Community 38 (web_src_app_app_routes_ts)]]
- [[_COMMUNITY_Community 39 (web_src_app_app_config_ts)|Community 39 (web_src_app_app_config_ts)]]
- [[_COMMUNITY_Community 40 (web_src_environments_environment_ts)|Community 40 (web_src_environments_environment_ts)]]
- [[_COMMUNITY_Community 41 (web_src_environments_environment_development_ts)|Community 41 (web_src_environments_environment_development_ts)]]
- [[_COMMUNITY_Community 42 (api_lib_cache_ts)|Community 42 (api_lib_cache_ts)]]
- [[_COMMUNITY_Community 43 (db_table_regeneration_log)|Community 43 (db_table_regeneration_log)]]
- [[_COMMUNITY_Community 44 (cache_empty_module)|Community 44 (cache_empty_module)]]
- [[_COMMUNITY_Community 45 (batch_BATCH_SIZE)|Community 45 (batch_BATCH_SIZE)]]
- [[_COMMUNITY_Community 46 (renderer_PrototypeElements)|Community 46 (renderer_PrototypeElements)]]
- [[_COMMUNITY_Community 47 (fuzzy_FuzzyMatch)|Community 47 (fuzzy_FuzzyMatch)]]
- [[_COMMUNITY_Community 48 (suggestions_route)|Community 48 (suggestions_route)]]
- [[_COMMUNITY_Community 49 (claudemd_phase2_fixture)|Community 49 (claudemd_phase2_fixture)]]
- [[_COMMUNITY_Community 50 (clientreq_voice_input)|Community 50 (clientreq_voice_input)]]
- [[_COMMUNITY_Community 51 (clientreq_role_hierarchy)|Community 51 (clientreq_role_hierarchy)]]
- [[_COMMUNITY_Community 52 (clientreq_keycloak_auth)|Community 52 (clientreq_keycloak_auth)]]
- [[_COMMUNITY_Community 53 (clientreq_impact_analysis)|Community 53 (clientreq_impact_analysis)]]

## God Nodes (most connected - your core abstractions)
1. `ModuleStructureInputComponent` - 14 edges
2. `WorkspaceComponent` - 13 edges
3. `ModulesPanelComponent` - 12 edges
4. `renderComponent()` - 12 edges
5. `RequirementInputComponent` - 10 edges
6. `UITokens Model` - 9 edges
7. `PrototypePreviewComponent` - 7 edges
8. `ProjectsComponent` - 7 edges
9. `ApiService` - 7 edges
10. `Renderer Dispatcher (index.ts)` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Speed Non-Negotiable Principle (millisecond-class)` --rationale_for--> `FLUSH_MS Constant (1500ms)`  [INFERRED]
  docs/Client Requirement.md → api/lib/batch.ts
- `AI is a Tool Not a Crutch (Key Principle)` --rationale_for--> `SIMILARITY_THRESHOLD (0.88)`  [INFERRED]
  docs/Client Requirement.md → api/lib/fuzzy.ts
- `MVP Scope (text input, prototype, versioning, multi-project)` --references--> `Prototype Generate Route`  [INFERRED]
  docs/Client Requirement.md → api/routes/prototype/generate.ts
- `Phase 4 Versions (partially built)` --references--> `Version History Route`  [INFERRED]
  CLAUDE.md → api/routes/history/index.ts
- `Full Version History (requirements + flows + prototypes)` --references--> `version_history DB Table`  [INFERRED]
  docs/Client Requirement.md → api/routes/history/index.ts

## Hyperedges (group relationships)
- **UITokens to Renderer to HTML String Pipeline** — models_uitokens, renderers_index, components_prototypepreview [EXTRACTED 0.95]
- **Module Tree Management Flow** — components_modulespanel, components_modulestructureinput, services_api [EXTRACTED 0.90]
- **Requirement Input to API to UITokens Generation Flow** — components_requirementinput, services_api, models_uitokens [INFERRED 0.85]
- **Two-Level Prompt-to-Token Cache Pipeline** — streamline_lib, db_table_prompt_cache, openai_lib, db_table_token_cache, hash_ts [EXTRACTED 0.95]
- **Self-Improving Dictionary Learning Loop** — dictionary, local_streamline, streamline_lib, openai_lib, db_table_local_dictionary [EXTRACTED 0.90]
- **Workspace Prototype Generation Flow** — workspace_component, prototype_service, api_service, openai_lib, streamline_lib [INFERRED 0.85]
- **Prototype Generation Pipeline** — generate_route, logger_logOpenAI, logger_logInternal, logger_openai_logs_table [EXTRACTED 1.00]
- **Module Hierarchy Pipeline** — modules_parse_route, modules_parse_parseLocal, modules_parse_parseWithAI, modules_parse_upsertNode, modules_table [EXTRACTED 1.00]
- **Batch Token Extraction Flow** — batch_queueTokenExtraction, batch_flush, batch_token_cache_write, logger_openai_logs_table [EXTRACTED 1.00]

## Communities

### Community 0 - "AI & Token Processing"
Cohesion: 0.1
Nodes (9): flush(), queueTokenExtraction (Batch Queue), token_cache Write (Batch), cleanPunctuation(), localStreamline(), replaceHinglish(), replaceUIKeywords(), callAI() (+1 more)

### Community 1 - "Product Vision & Roadmap"
Cohesion: 0.09
Nodes (26): Phase 3 Changes (partially built), Phase 4 Versions (partially built), MVP Scope (text input, prototype, versioning, multi-project), RAM is Sacred Principle, Full Version History (requirements + flows + prototypes), Prototype Generate Route, Version History Route, version_history DB Table (+18 more)

### Community 2 - "API Route Layer"
Cohesion: 0.12
Nodes (3): parseIndented(), parseLocal(), parseNumbered()

### Community 3 - "Module Structure Input"
Cohesion: 0.27
Nodes (2): ModuleStructureInputComponent, uid()

### Community 4 - "Backend Renderer Engine"
Cohesion: 0.24
Nodes (15): renderCardsGrid(), renderComponent(), renderDataTable(), renderElements(), renderEmptyState(), renderForm(), renderHeader(), renderHero() (+7 more)

### Community 5 - "Angular UI Components"
Cohesion: 0.22
Nodes (16): ModulesPanel Component, ModuleStructureInput Component, PrototypePreview Component, RequirementInput Component, VersionTimeline Component, ModuleNode Interface, RequirementInput Interface, UITokens Model (+8 more)

### Community 6 - "Core Infrastructure"
Cohesion: 0.19
Nodes (15): Unified AI Client, Database Pool (db.ts), Hono API Entry Point, DB Table: local_dictionary, DB Table: prompt_cache, DB Table: token_cache, Self-Improving Dictionary, Token Diff Utility (+7 more)

### Community 7 - "Workspace Page"
Cohesion: 0.16
Nodes (1): WorkspaceComponent

### Community 8 - "Modules Panel"
Cohesion: 0.22
Nodes (1): ModulesPanelComponent

### Community 9 - "Requirement Input"
Cohesion: 0.25
Nodes (1): RequirementInputComponent

### Community 10 - "Self-Improving Dictionary"
Cohesion: 0.38
Nodes (7): ensureLoaded(), learnFromStreamline(), learnFromTokens(), lookup(), schedulFlush(), translatePhrase(), upsertEntry()

### Community 11 - "Data Layer & Services"
Cohesion: 0.25
Nodes (9): ApiService, DB Table: modules, DB Table: projects, DB Table: version_history, Environment (Development), Environment (Production), ProjectsComponent, PrototypeService (+1 more)

### Community 12 - "Prototype Preview"
Cohesion: 0.25
Nodes (1): PrototypePreviewComponent

### Community 13 - "Projects Page"
Cohesion: 0.29
Nodes (1): ProjectsComponent

### Community 14 - "HTTP API Client"
Cohesion: 0.39
Nodes (1): ApiService

### Community 15 - "Prototype Service"
Cohesion: 0.33
Nodes (1): PrototypeService

### Community 16 - "UITokens Rendering Contract"
Cohesion: 0.33
Nodes (6): Backend Returns Pure UITokens (Key Principle), Component Union Type, renderComponent Dispatcher, renderElements Function, renderTokens Function, tokensToComponents Function

### Community 17 - "Shared Renderer Utilities"
Cohesion: 0.4
Nodes (0): 

### Community 18 - "App Bootstrap & Routing"
Cohesion: 0.4
Nodes (5): App Root Component, Application Config, App Routes, Application Bootstrap (main.ts), Landing Page Component

### Community 19 - "Landing Page"
Cohesion: 0.5
Nodes (1): LandingComponent

### Community 20 - "Seed Script"
Cohesion: 0.83
Nodes (3): delay(), generatePrototype(), run()

### Community 21 - "DB Pool & Migrations"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Logging Layer"
Cohesion: 0.67
Nodes (0): 

### Community 23 - "Fuzzy Match & AI Guardrails"
Cohesion: 0.67
Nodes (3): AI is a Tool Not a Crutch (Key Principle), SIMILARITY_THRESHOLD (0.88), fuzzyLookup Function

### Community 24 - "Prototyping Rationale"
Cohesion: 0.67
Nodes (3): HTML + Tailwind Rationale (zero build step, instant render), Instant Prototyping Capability, Rationale: Prototype Auto-triggers as you type

### Community 25 - "App Root Component"
Cohesion: 1.0
Nodes (1): App

### Community 26 - "Form Renderer"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Dashboard Renderer"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Frontend Renderer Index"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Login Renderer"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30 (list_renderer_renderlist)"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31 (version_timeline_component_versiontimelinecomponent)"
Cohesion: 1.0
Nodes (1): VersionTimelineComponent

### Community 32 - "Community 32 (batch_FLUSH_MS)"
Cohesion: 1.0
Nodes (2): FLUSH_MS Constant (1500ms), Speed Non-Negotiable Principle (millisecond-class)

### Community 33 - "Community 33 (projects_route)"
Cohesion: 1.0
Nodes (2): Projects CRUD Route, projects DB Table

### Community 34 - "Community 34 (claudemd_butterstack_project)"
Cohesion: 1.0
Nodes (2): Butterstack Project (CLAUDE.md), Platform Vision - Intelligent Delivery OS

### Community 35 - "Community 35 (claudemd_phase1_ideation)"
Cohesion: 1.0
Nodes (2): Phase 1 Ideation, Multilingual Text Input (Hinglish/Minglish/Gujarati)

### Community 36 - "Community 36 (web_src_main_ts)"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37 (web_src_app_app_spec_ts)"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38 (web_src_app_app_routes_ts)"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39 (web_src_app_app_config_ts)"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40 (web_src_environments_environment_ts)"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41 (web_src_environments_environment_development_ts)"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42 (api_lib_cache_ts)"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43 (db_table_regeneration_log)"
Cohesion: 1.0
Nodes (1): DB Table: regeneration_log

### Community 44 - "Community 44 (cache_empty_module)"
Cohesion: 1.0
Nodes (1): Cache Module (Deprecated/Empty)

### Community 45 - "Community 45 (batch_BATCH_SIZE)"
Cohesion: 1.0
Nodes (1): BATCH_SIZE Constant (5 items)

### Community 46 - "Community 46 (renderer_PrototypeElements)"
Cohesion: 1.0
Nodes (1): PrototypeElements Type

### Community 47 - "Community 47 (fuzzy_FuzzyMatch)"
Cohesion: 1.0
Nodes (1): FuzzyMatch Type

### Community 48 - "Community 48 (suggestions_route)"
Cohesion: 1.0
Nodes (1): Suggestions Route

### Community 49 - "Community 49 (claudemd_phase2_fixture)"
Cohesion: 1.0
Nodes (1): Phase 2 Fixture (future)

### Community 50 - "Community 50 (clientreq_voice_input)"
Cohesion: 1.0
Nodes (1): Voice Input Capability (Multi-speaker, Auto-detect)

### Community 51 - "Community 51 (clientreq_role_hierarchy)"
Cohesion: 1.0
Nodes (1): Role Hierarchy (Client/PM/BA/Dev/QA/Designer)

### Community 52 - "Community 52 (clientreq_keycloak_auth)"
Cohesion: 1.0
Nodes (1): Keycloak Authentication Integration

### Community 53 - "Community 53 (clientreq_impact_analysis)"
Cohesion: 1.0
Nodes (1): Impact Analysis Capability

## Knowledge Gaps
- **53 isolated node(s):** `App`, `VersionTimelineComponent`, `App Root Component`, `VersionTimeline Component`, `Landing Page Component` (+48 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `App Root Component`** (2 nodes): `App`, `app.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Form Renderer`** (2 nodes): `renderForm()`, `form.renderer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Renderer`** (2 nodes): `renderDashboard()`, `dashboard.renderer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Renderer Index`** (2 nodes): `renderTokens()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Renderer`** (2 nodes): `renderLogin()`, `login.renderer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30 (list_renderer_renderlist)`** (2 nodes): `renderList()`, `list.renderer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31 (version_timeline_component_versiontimelinecomponent)`** (2 nodes): `VersionTimelineComponent`, `version-timeline.component.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32 (batch_FLUSH_MS)`** (2 nodes): `FLUSH_MS Constant (1500ms)`, `Speed Non-Negotiable Principle (millisecond-class)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33 (projects_route)`** (2 nodes): `Projects CRUD Route`, `projects DB Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34 (claudemd_butterstack_project)`** (2 nodes): `Butterstack Project (CLAUDE.md)`, `Platform Vision - Intelligent Delivery OS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35 (claudemd_phase1_ideation)`** (2 nodes): `Phase 1 Ideation`, `Multilingual Text Input (Hinglish/Minglish/Gujarati)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36 (web_src_main_ts)`** (1 nodes): `main.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37 (web_src_app_app_spec_ts)`** (1 nodes): `app.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38 (web_src_app_app_routes_ts)`** (1 nodes): `app.routes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39 (web_src_app_app_config_ts)`** (1 nodes): `app.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40 (web_src_environments_environment_ts)`** (1 nodes): `environment.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41 (web_src_environments_environment_development_ts)`** (1 nodes): `environment.development.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42 (api_lib_cache_ts)`** (1 nodes): `cache.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43 (db_table_regeneration_log)`** (1 nodes): `DB Table: regeneration_log`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44 (cache_empty_module)`** (1 nodes): `Cache Module (Deprecated/Empty)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45 (batch_BATCH_SIZE)`** (1 nodes): `BATCH_SIZE Constant (5 items)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46 (renderer_PrototypeElements)`** (1 nodes): `PrototypeElements Type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47 (fuzzy_FuzzyMatch)`** (1 nodes): `FuzzyMatch Type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48 (suggestions_route)`** (1 nodes): `Suggestions Route`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49 (claudemd_phase2_fixture)`** (1 nodes): `Phase 2 Fixture (future)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50 (clientreq_voice_input)`** (1 nodes): `Voice Input Capability (Multi-speaker, Auto-detect)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51 (clientreq_role_hierarchy)`** (1 nodes): `Role Hierarchy (Client/PM/BA/Dev/QA/Designer)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52 (clientreq_keycloak_auth)`** (1 nodes): `Keycloak Authentication Integration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53 (clientreq_impact_analysis)`** (1 nodes): `Impact Analysis Capability`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `flush()` connect `AI & Token Processing` to `Product Vision & Roadmap`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `openai_logs DB Table` connect `Product Vision & Roadmap` to `AI & Token Processing`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `App`, `VersionTimelineComponent`, `App Root Component` to the rest of the system?**
  _53 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AI & Token Processing` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Product Vision & Roadmap` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `API Route Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._