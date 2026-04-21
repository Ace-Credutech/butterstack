# Graph Report - .  (2026-04-21)

## Corpus Check
- 81 files · ~54,138 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 434 nodes · 485 edges · 71 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]

## God Nodes (most connected - your core abstractions)
1. `ElicitationChatComponent` - 43 edges
2. `WorkspaceComponent` - 21 edges
3. `ModulesPanelComponent` - 20 edges
4. `PrototypePreviewComponent` - 19 edges
5. `ModuleStructureInputComponent` - 14 edges
6. `DesignSettingsComponent` - 12 edges
7. `renderComponent()` - 12 edges
8. `MembersPanelComponent` - 11 edges
9. `RequirementInputComponent` - 11 edges
10. `ProjectsComponent` - 10 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

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

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (1): ElicitationChatComponent

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (5): bgWork(), extractSection(), parseIndented(), parseLocal(), parseNumbered()

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (13): ensureLoaded(), learnFromStreamline(), learnFromTokens(), lookup(), schedulFlush(), translatePhrase(), upsertEntry(), cleanPunctuation() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (1): WorkspaceComponent

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (1): ModulesPanelComponent

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (1): PrototypePreviewComponent

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (8): dsBgGradient(), dsBorderAccent(), dsCheckboxColor(), dsColorName(), initials(), renderAvatar(), renderSectionCard(), renderStatCard()

### Community 7 - "Community 7"
Cohesion: 0.27
Nodes (2): ModuleStructureInputComponent, uid()

### Community 8 - "Community 8"
Cohesion: 0.24
Nodes (15): renderCardsGrid(), renderComponent(), renderDataTable(), renderElements(), renderEmptyState(), renderForm(), renderHeader(), renderHero() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (1): DesignSettingsComponent

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (1): MembersPanelComponent

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (1): RequirementInputComponent

### Community 12 - "Community 12"
Cohesion: 0.26
Nodes (8): aiChat(), getClients(), getUserKeys(), buildContextSummary(), formatHistory(), generateBreakdown(), generateDocumentation(), generateNextQuestion()

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (1): ProjectsComponent

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (1): AuthService

### Community 15 - "Community 15"
Cohesion: 0.39
Nodes (1): ApiService

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (1): ElicitationService

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (1): ApiKeysSettingsComponent

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (1): UserAvatarComponent

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (1): UsagePanelComponent

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (1): PrototypeService

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (1): ExportService

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (1): LandingComponent

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (1): RegisterComponent

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 0.6
Nodes (3): logComm(), sendEmail(), updateLog()

### Community 27 - "Community 27"
Cohesion: 0.6
Nodes (3): logComm(), sendSms(), updateLog()

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (1): LoginComponent

### Community 29 - "Community 29"
Cohesion: 0.83
Nodes (3): delay(), generatePrototype(), run()

### Community 30 - "Community 30"
Cohesion: 0.67
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (1): App

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): VersionTimelineComponent

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Butterstack Project (CLAUDE.md)

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Backend Returns Pure UITokens (Key Principle)

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): Phase 1 Ideation

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): Phase 2 Fixture (future)

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): Phase 3 Changes (partially built)

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): Phase 4 Versions (partially built)

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): Platform Vision - Intelligent Delivery OS

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (1): Instant Prototyping Capability

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (1): HTML + Tailwind Rationale (zero build step, instant render)

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (1): Multilingual Text Input (Hinglish/Minglish/Gujarati)

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (1): Voice Input Capability (Multi-speaker, Auto-detect)

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): AI is a Tool Not a Crutch (Key Principle)

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): RAM is Sacred Principle

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (1): Role Hierarchy (Client/PM/BA/Dev/QA/Designer)

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (1): MVP Scope (text input, prototype, versioning, multi-project)

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (1): Keycloak Authentication Integration

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (1): Impact Analysis Capability

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): Full Version History (requirements + flows + prototypes)

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (1): Rationale: Prototype Auto-triggers as you type

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): Speed Non-Negotiable Principle (millisecond-class)

## Knowledge Gaps
- **22 isolated node(s):** `App`, `VersionTimelineComponent`, `Butterstack Project (CLAUDE.md)`, `Backend Returns Pure UITokens (Key Principle)`, `Phase 1 Ideation` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 34`** (2 nodes): `App`, `app.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `authInterceptor()`, `auth.interceptor.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `renderForm()`, `form.renderer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `renderDashboard()`, `dashboard.renderer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `renderTokens()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `renderLogin()`, `login.renderer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `renderList()`, `list.renderer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `VersionTimelineComponent`, `version-timeline.component.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `authGuard()`, `auth.guard.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `brd-generator.ts`, `generateBrd()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `main.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `app.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `app.routes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `app.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `environment.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `environment.development.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `cache.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Butterstack Project (CLAUDE.md)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `Backend Returns Pure UITokens (Key Principle)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `Phase 1 Ideation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `Phase 2 Fixture (future)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `Phase 3 Changes (partially built)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `Phase 4 Versions (partially built)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `Platform Vision - Intelligent Delivery OS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `Instant Prototyping Capability`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `HTML + Tailwind Rationale (zero build step, instant render)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `Multilingual Text Input (Hinglish/Minglish/Gujarati)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `Voice Input Capability (Multi-speaker, Auto-detect)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `AI is a Tool Not a Crutch (Key Principle)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `RAM is Sacred Principle`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `Role Hierarchy (Client/PM/BA/Dev/QA/Designer)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `MVP Scope (text input, prototype, versioning, multi-project)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `Keycloak Authentication Integration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `Impact Analysis Capability`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `Full Version History (requirements + flows + prototypes)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `Rationale: Prototype Auto-triggers as you type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `Speed Non-Negotiable Principle (millisecond-class)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `App`, `VersionTimelineComponent`, `Butterstack Project (CLAUDE.md)` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._