# Butterstack-2 — Product Flow Whiteboard

_Transcribed from the whiteboard sketch. Original language preserved (Hinglish). This is the canonical user-journey flow that the v2 rebuild must honor._

---

## 🌊 Main Flow (top-to-bottom)

```
 ┌──────────────┐     ┌──────────────────┐     ┌─────────────────────────┐     ┌──────────────┐
 │ User aata hai│ ──▶ │ Project Create   │ ──▶ │ Uske pas kuch written   │ ──▶ │ System Feed  │
 │              │     │ karta hai        │     │ content, excel file,    │     │              │
 │              │     │                  │     │ kuch documenations      │     │              │
 └──────────────┘     └──────────────────┘     └─────────────────────────┘     └──────┬───────┘
                                                                                       │
                                                                                       ▼
                                                                    ┌──────────────────────────────┐
                                                                    │ Overall Idea → Tumko         │
                                                                    │ kya chahiye →                │
                                                                    │ Confidence Generate          │
                                                                    │ hua ki system ko             │
                                                                    │ samajh gaya                   │
                                                                    └──────────────┬───────────────┘
                                                                                   │
                                                                                   ▼
                                                                 ┌──────────────────────────────┐
                                                                 │ Expandable Chat Window →     │
                                                                 │ Large scale conversation or  │
                                                                 │ planning ke liye             │
                                                                 └──────────────┬───────────────┘
                                                                                │
                                                                                ▼
                                                                ┌──────────────────────────┐
                                                                │ Modules / Sub            │
                                                                │ Modules / Features       │
                                                                └──────────────┬───────────┘
                                                                               │
                                                                               ▼
                                                                ┌──────────────────────────┐
                                                                │ Roles in the system       │
                                                                └──────────────┬───────────┘
                                                                               │
                                                                               ▼
                                                                ┌──────────────────────────┐     ┌──────────────────────────┐
                                                                │ Role Capability Matrix   │ ──▶ │ Module / Sub Module /    │
                                                                └──────────────────────────┘     │ Feature vs Role dikh     │
                                                                                                 │ raha hai                 │
                                                                                                 └──────────────┬───────────┘
                                                                                                                │
                                                                                                                ▼
                                                                                            ┌────────────────────────────────┐
                                                                                            │ Questions to Confirm            │
                                                                                            │ Prototype and Requirements       │
                                                                                            │ and Polish It Even More          │
                                                                                            └──────────────┬─────────────────┘
                                                                                                           │
                                                                                                           ▼
                                                                                            ┌────────────────────────────────┐     ┌──────────────────────────────┐
                                                                                            │ Confirm and Get the              │ ──▶ │ Modules / Sub Modules /      │
                                                                                            │ Changes Done                      │     │ Features / Pages             │
                                                                                            └────────────────────────────────┘     └──────────────┬───────────────┘
                                                                                                                                                 │
                                                                                                                                                 ▼
                                                                                                                                   ┌────────────────────────────────┐
                                                                                                                                   │       Context Decide Hua        │
                                                                                                                                   └────┬──────────┬───────────┬────┘
                                                                                                                                        │          │           │
                                                           ┌────────────────────────────────────────────────────────────────────────────┘          │           │
                                                           │                                                                                       │           │
                                                           ▼                                                                                       ▼           ▼
                                        ┌──────────────────────────┐     ┌─────────────────────┐     ┌───────────────────────┐         ┌────────────────────┐
                                        │  User Input →            │ ◀── │ Requirement Tokens  │ ◀── │ 🔴 USER INPUT TOKENS  │ ──────▶ │ Inter Feature      │
                                        │  Prototype / Excel /     │     │                     │     │   (source of truth)   │         │ Linking            │
                                        │  Details / BRD           │     │                     │     │                       │         └────────────────────┘
                                        └──────────────────────────┘     └─────────┬───────────┘     └───────────┬───────────┘
                                                                                    │                             │
                                                                                    └───────────▼─────────────────┘
                                                                                   ┌────────────────────────────┐
                                                                                   │    AI Documentation         │
                                                                                   └─┬──────┬───────┬────┬──────┘
                                                                                     │      │       │    │
                                                                  ┌──────────────────┘      │       │    └──────────────────┐
                                                                  ▼                         ▼       ▼                       ▼
                                                 ┌──────────────────┐     ┌──────────────────────┐     ┌────────────┐     ┌──────────────┐
                                                 │ Business Context │     │ Functional           │ ──▶ │ Test Cases │ ──▶ │ Role Actions │
                                                 │                  │     │ Requirements         │     │            │     │              │
                                                 └──────────────────┘     └──────────────────────┘     └────────────┘     └──────────────┘
```

---

## 🔁 Feedback Loop (from the right side — new conversation / changes flow)

```
 Context Decide Hua ─────────────────────────────────▶ ┌──────────────────────────┐
                                                       │ New Quiz / New           │
                                                       │ Conversation             │
                                                       └──────────────┬───────────┘
                                                                      │
                                                                      ▼
                                                       ┌──────────────────────────┐
                                                       │ Questions and            │
                                                       │ Decision Points          │
                                                       └──────────────┬───────────┘
                                                                      │
                                                                      ▼
                                                       ┌──────────────────────────┐     ┌──────────────────────────┐
                                                       │ User Input Tokens         │ ──▶ │ Requirement Tokens       │
                                                       │ Revise                    │     │ Revise                   │
                                                       └──────────────┬───────────┘     └──────────────┬───────────┘
                                                                      │                                 │
                                                                      ▼                                 ▼
                                                       ┌──────────────────────────┐     ┌──────────────────────────┐
                                                       │ Who did this              │     │ Impacts kaunse           │
                                                       │                           │     │ kaunse features          │
                                                       └───────────────────────────┘     └──────────────┬───────────┘
                                                                                                         │
                                                                                                         ▼
                                                                                        ┌──────────────────────────┐     ┌──────────────────────────┐
                                                                                        │ User Input token         │ ──▶ │ Requirement Tokens       │
                                                                                        └──────────────────────────┘     └──────────────┬───────────┘
                                                                                                                                         │
                                                                                                                                         ▼
                                                                                                                  ┌────────────────────────────────────┐
                                                                                                                  │ Checking Current Requirement        │
                                                                                                                  │ Tokens and New Feedback ko          │
                                                                                                                  │ check karte hue → Impacts aa raha   │
                                                                                                                  │ hai → Toh Voh Features ka User      │
                                                                                                                  │ Input Change hoga                   │
                                                                                                                  └────────────────────────────────────┘
```

---

## 🎛️ Event Types (bottom strip — ways the user mutates the project)

These are the event kinds the system must accept as first-class:

```
┌────────────────────┐  ┌────────────────┐  ┌──────┐  ┌────────────┐  ┌────────────────────┐
│ Mega Conversation  │  │ Conversation   │  │ Quiz │  │ BRD Change │  │ Details Mein Kuch  │
│                    │  │                │  │      │  │            │  │ Change Kiya         │
└────────────────────┘  └────────────────┘  └──────┘  └────────────┘  └────────────────────┘

┌──────────────┐      ┌────────────────────┐      ┌────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│ BRD Overall  │      │ Excel → Tabular    │      │ Module Addition /  │      │ Prototype Change     │      │ New Type of UI →     │
│              │      │ Requirement →      │      │ Sub Module         │      │ Text                 │      │ System ko Voh naya   │
└──────┬───────┘      │ Change             │      │ Addition / Feature │      └──────────────────────┘      │ type ka UI dene ka   │
       │              └──────┬─────────────┘      │ Addition           │                                     │ system banana hai →  │
       ▼                     ▼                    └────────────────────┘                                     │ Jo Render karne      │
┌──────────────────┐  ┌──────────────────┐                                                                    │ mein madat karega    │
│ Always           │  │ Comment Kahi     │                                                                    └──────────────────────┘
│ Versioning Hoga  │  │ Par              │
│ → Jab Jab Export │  └──────────────────┘
│ Karenge          │
└──────────────────┘
```

**Every one of these is an event type.** They must be modelled as typed events in `be/src/domain/events.ts` from day one.

---

## 💡 The "System Suggest" Loop (bottom-centre)

```
 ┌────────────────────┐     ┌────────────────────────────┐     ┌──────────────────────┐
 │ Every time user    │ ──▶ │ Idea deni chahiye ki       │ ──▶ │ Confirm and Change    │
 │ changes something  │     │ bhai yaha yaha bhi toh     │     │                      │
 │                    │     │ change hoga               │     │                      │
 └────────────────────┘     └────────────────────────────┘     └──────────────────────┘
```

**Implication**: after any mutation, the AI should proactively highlight cascaded impacts ("if you rename Login → Sign In, these 3 other places also reference it — confirm cascade?").

---

## 🎯 What This Flow Tells Us (the v2 contract)

1. **Entry is plural** — conversation, uploaded Excel, uploaded doc, written content. Not just chat.
2. **Confidence is a first-class checkpoint** — "system ko samajh gaya" is its own state, not just a computed score.
3. **Chat expands to "planning mode"** for large-scale work.
4. **Roles + Role Capability Matrix are siblings to the module tree** — not tacked on later.
5. **"Context Decide Hua" is the commit point** — 5 projections fan out from here: User Input → surfaces, Requirement Tokens, User Input Tokens (red/SOT), AI Documentation, Inter-Feature Linking.
6. **🔴 User Input Tokens is the root source of truth** (shown in red on the board). Everything else is derived.
7. **AI Documentation fans out to**: Business Context, Functional Requirements, Test Cases, Role Actions.
8. **The feedback loop is explicit**: New conversation / quiz → Questions & Decision Points → Revise tokens (User Input + Requirement) → Attribute (who did this) → Impact analysis (which features affected) → Cascade confirmation.
9. **The event strip at the bottom is the full mutation vocabulary** — any way the user changes the project goes through one of those event types.
10. **Versioning is automatic at export time** — "Jab jab export karenge, versioning hoga."
11. **Comments live on any node, anywhere** — "Comment Kahi Par."
12. **System proactively suggests cascades** — "idea deni chahiye ki yaha yaha bhi change hoga."

---

## 📌 Mapping Back to `master-plan.md`

| Whiteboard concept | v2 implementation location |
|---|---|
| System Feed | `be/src/routes/projects.ts` (POST `/projects` with optional seed) + multipart uploader |
| Confidence Generate | `be/src/ai/classifier.ts` emits `understanding.confirmed` event |
| Expandable Chat Window | `fe/src/app/components/conversation-panel/` with `mega-mode` variant |
| Roles / Role Capability Matrix | `be/src/domain/roles.ts` + dedicated panel in `fe` |
| Context Decide Hua | the `plan.confirm` event — triggers projection fan-out |
| 🔴 User Input Tokens | canonical `TextSlot` with `source: 'user'` in typed UITokens |
| Requirement Tokens | `be/src/domain/tokens.ts` — derived projection from User Input Tokens |
| AI Documentation (4 branches) | `StructuredDoc` fields: `businessContext`, `functionalities`, `acceptance` / `testCases`, `roleAccess` |
| Inter Feature Linking | `page_features` + cross-feature references in StructuredDoc |
| Revise loop | New event types: `tokens.revise`, `requirement.revise` with `actor_id` for attribution |
| Impact analysis | Projector computes impact set from `provenance_events[]` |
| Event strip | `be/src/domain/events.ts` — discriminated union |
| Always versioning on export | `jobs` table + exports emit a version snapshot automatically |
| Cascade suggestions | Post-event hook in projector runs the "cascade suggester" AI step |

---

## 🗒️ Notes

- Keep this file alongside `investor-architecture.md`. Investor view = 4 layers; builder view = this whiteboard flow.
- Before writing any `be/` or `fe/` code, every box on this board must be an entry in `feature-parity.csv` with owner + status.
