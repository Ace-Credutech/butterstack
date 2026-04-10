# Client Requirement

---

## Session 1 — April 10, 2026

---

### Vision Statement

A unified platform that collapses the entire software delivery lifecycle — from requirement capture to production — into a single, intelligent, real-time super UX. Every role sees exactly what they need, exactly when they need it.

---

### Core Concept

The platform is not a project management tool. It is an **intelligent delivery operating system** that:

- Understands context as requirements are being typed
- Recalls prior experience and decisions automatically
- Generates prototypes in milliseconds, not days
- Builds user flows on the fly
- Performs impact analysis before a change is approved
- Manages versions and scope with full traceability

---

### Capability Breakdown

#### 1. Requirement Documentation (Extreme)
- As the user types, the system recalls relevant past decisions, prior requirements, and similar contexts
- Requirements are not just text — they are structured, linked, and impact-aware
- Context is applied automatically based on which module/feature/domain is being written about

**Input Methods:**
- **Text input** — standard keyboard, rich input space
- **Voice input** — speak requirements, system transcribes and structures in real time
- Both methods are first-class — voice is not an afterthought
- **Prototype generation is automatic** — triggers continuously as you type or speak, no manual submit

**Voice — Advanced Capabilities:**
- **Multilingual** — handles mixed-language speech naturally (e.g. Hindi + Marathi + English in the same sentence/conversation). No language switching required from the user.
- **Multi-speaker** — multiple people can speak simultaneously or in sequence
- **Speaker identity is auto-detected** — no login, no manual assignment, no voice pre-enrollment required. System figures it out using a combination of voice characteristics AND contextual cues — vocabulary, domain language, speaking patterns, topic ownership.
- **Context-aware arbitration** — when multiple people speak, the system does not just transcribe all of it blindly. It weighs input based on:
  - Speaker role/priority (PM overrides Designer on scope; Client intent overrides all on vision)
  - Semantic correctness — who is saying the thing that aligns with prior context and decisions
  - Conflict resolution — contradictions are flagged, not silently resolved; anyone in the session can resolve to start with. Every resolution is itself versioned and attributed (who resolved it, when, what they chose).
- **Streaming preferred** — real-time transcription as speech happens; fallback to submit-then-transcribe if latency becomes a constraint

#### 2. Instant Prototyping
- The moment a requirement is captured, a prototype materializes — not after review, in milliseconds
- Flows are generated automatically from requirement language
- Prototype output: **live UI code** — not a mockup image or wireframe, actual rendered UI code
- Best case target: functional, interactive UI generated in milliseconds from requirement language
- **Prototype language: HTML + Tailwind CSS** — chosen for generation speed, zero build step, instant browser render

#### 3. Development Pipeline Integration
- Prototypes feed directly into development tasks
- Developers see only what is relevant to their current work
- No context switching — the system surfaces the right requirement, flow, and prototype in one view

#### 4. QA
- QA sees requirements, flows, and prototype side by side
- Test cases generated or suggested from requirement language
- Defects are linked back to requirements automatically

#### 5. Impact Analysis (Super)
- Every change — requirement edit, scope addition, version bump — triggers real-time impact analysis
- Impact shown across: timeline, effort, dependent features, open QA items, in-flight development
- Analysis is calculated before approval, not after

#### 6. Change, Version & Scope Management
- Full version history on every requirement, flow, and prototype
- Scope changes are tracked with who requested, who approved, and what was impacted
- Document approvals and version approvals are built-in workflows — not external sign-offs

#### 7. Role-Based Views (Everyone Sees What They Need)
- Each persona (Client, PM, Developer, QA, Designer) has a tailored view
- No one is overwhelmed with irrelevant information
- Views are dynamic — they shift based on where the project is in its lifecycle

**Confirmed Primary Roles:** Client, PM, Developer, QA, Designer

**PM View — Special:** PM is the only role that can toggle between all views. They see the Client-facing view AND the internal team view (Dev, QA, Designer) — switchable on demand. PM is the bridge.

---

### Key Principles

- **Speed is non-negotiable everywhere** — prototypes, flows, analysis, history browsing, rendering — all millisecond-class. Canvas or equivalent techniques to be used wherever DOM rendering becomes a bottleneck.
- **RAM is sacred** — nothing is held in memory that can live on the server. Context, history, speaker profiles, versions — all API-persisted and fetched on demand. The client stays lean.
- **Readability is a first-class UX principle** — every view, timeline, list, and flow must be immediately scannable. Grouping, hierarchy, and whitespace are tools, not decoration.
- **Local-first for speed** — anything that can run in the browser (transcription, rendering, computation) should. APIs are for what the browser cannot do, not for convenience.
- **AI is a tool, not a crutch** — OpenAI called only when no faster or local alternative exists. Every AI call must justify its latency.
- **Context is automatic** — the system knows what you're working on and surfaces relevant memory
- **No tool-switching** — requirements, prototypes, flows, approvals, and versions live in one place
- **Approval is built-in** — documents and versions are approved inside the platform, not via email or external tools

---

### Decisions Confirmed

| Decision | Answer |
|---|---|
| Primary Roles | Client, PM, Developer, QA, Designer |
| PM View | Toggleable — visible to all, anyone can see which view PM is on |
| Prototyping Output | Live UI code (best case — rendered, interactive) |
| Prototype Language | HTML + Tailwind CSS — fastest generation, zero build step, instant render |
| Input Methods | Text + Voice (both first-class) |
| Voice — Language | Multilingual — Hindi, Marathi, English, mixed mid-sentence |
| Voice — Multi-speaker | Yes — multiple people simultaneously, context-aware arbitration |
| Voice — Speaker Identity | Auto-detected — no login or manual assignment required |
| Speaker Context Persistence | API-persisted across sessions — never held in RAM; fetched on demand, released when not needed |
| Voice — Arbitration | Priority by role + semantic correctness; conflicts flagged, not silently resolved |
| Conflict Resolution Owner | Anyone — no fixed owner to start with |
| Voice — Streaming | Real-time preferred; fallback to submit-then-transcribe if latency requires |
| Prototype Trigger | Automatic — fires continuously as you type or speak |
| Prototype Versioning | Surface shows latest always; every iteration silently versioned and fully restorable |
| Prototype History UX | Two-level timeline — per module/page (independent) + project-level master timeline (rolls up all modules) |
| History Rendering | Fast rendering non-negotiable; Canvas under consideration to avoid DOM bottlenecks |
| Versioning Scope | Applies to everything equally — requirements text, flows, and prototypes all versioned |
| Timeline Unit | Every meeting + every decision — not keystrokes or auto-saves. Meaningful events only. |
| Platform | Web app |
| Integrations | Out of scope for now — to be addressed later |

---

### Backend Architecture

One modularized backend — single deployable, internally separated by concern. Each module is independently maintained but not independently deployed. Confirmed modules so far:

| Module | Responsibility |
|---|---|
| Context Service | Speaker profiles, session context, cross-session memory — API-persisted, never in RAM |
| Versioning Service | All version history — requirements, flows, prototypes; timeline units (meetings + decisions) |
| Requirements Service | Requirement storage, linking, impact metadata |
| Prototype Service | HTML + Tailwind generation, rendering, version snapshots |
| (more to be defined) | — |

**Stack (Confirmed):**
| Layer | Technology |
|---|---|
| Frontend | Angular + TypeScript |
| Package Manager / Runtime | Bun — across frontend and backend |
| Backend | Hono + TypeScript, running on Bun |
| Database | PostgreSQL |
| AI / LLM | OpenAI API — used selectively, only where truly needed |
| Voice Transcription | Deferred — Whisper speed TBD. Start with text input; voice to be layered in once transcription latency is validated |
| Input — V1 | Multilingual text — all typed in English script (romanized). Hinglish, Minglish (Marathi in English), Gujarati in English. No Devanagari, no RTL. System understands meaning across languages, not script rendering. |
| API Response Target | Millisecond-class — any API call must feel instant |
| Deployment | Coolify — single server, self-hosted; server specs TBD |
| Database Access | `pg` (node-postgres) — safe parameterized SQL scripts, written to be human and AI readable |
| Prototype Output | HTML + Tailwind CSS |
| Existing Systems | None — greenfield |

**Meeting Definition:** A meeting is a manually started and ended session. User explicitly opens a session (start) and closes it (end). Everything captured in between — voice, decisions, requirement changes, prototype iterations — belongs to that meeting on the timeline.

**Master Timeline UX:** Events grouped by module — not a flat feed. Readable at a glance. Each module is a collapsible group; decisions and meetings inside are scannable without noise. Readability is a first-class UX principle across the entire platform, not just the timeline.

---

### V1 Confirmed Scope
1. Multilingual text input — romanized English script (Hinglish, Minglish, Gujarati in English, etc.)
2. Requirement capture — structured, linked, context-aware
3. Auto prototype generation — HTML + Tailwind, fires as you type
4. Basic versioning — every requirement and prototype versioned; browsable timeline per module + project master
5. Multi-project support — multiple projects running simultaneously from day one
6. Authentication — Keycloak (already hosted); integrate, do not reinvent

**V1 Primary User: Business Analyst (BA)** — the BA is the first and core user of this platform. The entire V1 UX is optimized for how a BA works: capturing requirements, generating prototypes, managing versions, and navigating across projects.

---

### Authentication & User Management
- **Provider:** Keycloak — self-hosted, already running
- **Approach:** Integrate via Keycloak's OIDC/OAuth2 — no custom auth logic
- **Role mapping:** Users are added/managed in the platform; platform syncs roles to Keycloak. Platform is the source of truth for user management.
- **BA role:** Sits under PM in the role hierarchy — BA is a sub-role of PM, not a separate top-level role
- **BA access:** All projects, no scoping in MVP — access complications are post-MVP

### Role Hierarchy (Confirmed)
```
Client
PM
  └── BA (Business Analyst) ← V1 primary user
Developer
QA
Designer
```

---

### Role Hierarchy (Final — MVP)
```
Super Admin        ← platform-level, manages users + projects
Client
PM
  └── BA           ← V1 primary user, all projects
Developer
QA
Designer
```

### Keycloak Sync Rules
- **Sync trigger:** Real-time — fires on user create and user update in the platform
- **Direction:** Platform → Keycloak (platform is source of truth)
- **Realm:** Existing realm — integrate within it, do not create a new one
- **Super Admin:** Distinct top-level role; manages users, projects, and platform configuration

---

---

## MVP — Prototyping Phase (Starting Now)

**Auth:** Skipped entirely for MVP. No login, no Keycloak, no role enforcement. Move fast, validate the core.

**MVP Goal:** Get the core loop working and feeling right —
1. Open the platform
2. Type a requirement (in any romanized language)
3. Prototype appears instantly — HTML + Tailwind, live in the browser
4. Versions tracked silently in the background

Everything else (auth, roles, multi-speaker, voice, impact analysis) is post-MVP.

---

### Open Questions / To Clarify
*(Parked — resume after MVP is validated)*
- Super Admin — single or multiple?
- User deletion behavior with Keycloak
- Keycloak realm/client name

---

*More inputs will be added to this document as the session continues.*
