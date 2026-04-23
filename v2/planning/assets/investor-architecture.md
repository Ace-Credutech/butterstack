# Butterstack — Investor-Ready Architecture & Flow

_Saved from the investor deck walkthrough. Keep this as the canonical high-level narrative._

---

## 🎯 The One-Liner

> **"We turn messy stakeholder conversations into production-ready specifications, live prototypes, and export-ready documents — in minutes, not weeks."**

---

## 📉 The Problem

```
┌───────────────────────────────────────────────────────────────────┐
│              HOW REQUIREMENTS ARE GATHERED TODAY                  │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Stakeholder        BA interprets        Word / Excel              │
│  Meetings     ──▶   & rewrites     ──▶   docs manually             │
│  (any lang)         (English only)       (static, drift fast)      │
│                           │                      │                 │
│                           ▼                      ▼                 │
│                    Figma mockups           Dev re-reads            │
│                    built separately        & re-interprets         │
│                           │                      │                 │
│                           └──────────┬───────────┘                 │
│                                      ▼                             │
│                        ⏱   3–8 WEEKS PER PROJECT                   │
│                        💸  $50K–$200K PER ENGAGEMENT               │
│                        😤  40%+ REWORK (Gartner)                   │
│                        📉  VOCABULARY DRIFTS AT EVERY HOP          │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

Every translation hop loses signal. Stakeholder says **"username login"** → BA writes **"email auth"** → dev builds **email** → demo fails → rework.

---

## ✨ The Butterstack Solution

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                    ║
║                      🧈  BUTTERSTACK                               ║
║                                                                    ║
║   ONE PLATFORM — CONVERSATION → SPEC → PROTOTYPE → HANDOFF         ║
║                                                                    ║
║   🗣  Talk in ANY language (Hinglish, Gujarati, English, mixed)    ║
║   🤖  AI captures intent, preserves YOUR vocabulary                ║
║   🌳  Auto-structures into modules · features · pages              ║
║   📄  15-section docs written for you                              ║
║   🎨  Live prototype — every text click-to-edit                    ║
║   📤  BRD · Excel · Mindmap · Shareable link                       ║
║   🧠  Confidence score tells you what's weak                       ║
║                                                                    ║
║            ⏱  Minutes, not weeks                                   ║
║            💸  ~90% cost reduction                                 ║
║            🎯  Zero vocabulary drift                               ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 🏗️ System Architecture — 4 Layers

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   LAYER 4 — SURFACES (what the world sees)                          │
│   ┌──────────────┐ ┌──────────────┐ ┌────────┐ ┌────────┐          │
│   │   Workspace  │ │  Prototype   │ │  BRD   │ │ Share  │          │
│   │  (3-panel)   │ │   (iframe)   │ │ Excel  │ │  Link  │          │
│   └──────────────┘ └──────────────┘ └────────┘ └────────┘          │
│                            ▲                                         │
├────────────────────────────┼────────────────────────────────────────┤
│                            │                                         │
│   LAYER 3 — PROJECTIONS (derived artefacts)                          │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐      │
│   │ Structured   │ │  UITokens    │ │ DEASV    │ │ Exports  │      │
│   │ Doc (15 sec) │ │ (role-tag)   │ │ Score    │ │ HTML/XLSX│      │
│   └──────────────┘ └──────────────┘ └──────────┘ └──────────┘      │
│                            ▲                                         │
├────────────────────────────┼────────────────────────────────────────┤
│                            │                                         │
│   LAYER 2 — INTELLIGENCE (the AI brain)                              │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │  🌐 Multilingual Streamliner (Hinglish → clean English)   │     │
│   │  🧪 Extractor  (prompt → semantic tokens)                  │     │
│   │  🎯 Classifier (feature vs UI element vs legal link)       │     │
│   │  ✍️  Doc Writer (conversation → 15 structured sections)    │     │
│   │  🔄 Incremental Regenerator (only touches what changed)    │     │
│   │  📚 Glossary    (YOUR vocabulary, preserved project-wide)  │     │
│   └──────────────────────────────────────────────────────────┘     │
│                            ▲                                         │
├────────────────────────────┼────────────────────────────────────────┤
│                            │                                         │
│   LAYER 1 — STATE (the single source of truth)                       │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │  Project                                                   │     │
│   │    ├── Modules (recursive tree, 3 deep)                    │     │
│   │    │     └── Features (rich typed docs)                    │     │
│   │    └── Pages (role-tagged UITokens, editable slots)        │     │
│   │                                                              │     │
│   │  + Conversation log · Confidence score · Edit history      │     │
│   │  + Two-level cache · Background job queue                   │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 The User Flow — What Actually Happens

```
   👤 PRODUCT MANAGER                     🏢 BUTTERSTACK
   ─────────────────                      ────────────────

   "ID card banana hai       ──────▶      🌐 Streamliner cleans:
    students ke liye,                      "Build an ID card
    with photo aur                          generator for students
    QR code"                                with photo & QR code"

                                          🧪 Extract intent
                                                ↓
   ◀──────  AI asks: "Who can generate?       💬 Ask clarifying Qs
            What info on the card?                 (purpose + behavior)
            Physical or digital?"

   "Admin aur teachers...    ──────▶      📚 Glossary captures:
    digital AND printable..."              "teachers", "printable"
                                                ↓
                                          🎯 Classify message type
                                                ↓
   ◀──────  Proposes 3-6 modules           🌳 Proactive Planner
            with features + pages               emits typed plan

   [Confirms or edits]       ──────▶      ⚙️  State transaction:
   [Renames "Login"                              • upsert tree
    → "Sign In"]                                  • link features↔pages
                                                  • seed pages
                                                  • queue background job
                                                                ↓
                                          📄 Doc Writer (15 sections
                                              per feature, incremental)
                                                                ↓
                                          🎨 Token Extractor
                                              (cache-bypass for freshness)
                                                                ↓
                                          📊 Confidence Scorer (DEASV)

   ◀──────  LIVE PROTOTYPE                 📺 Render:
            + BRD + Excel + Mindmap             role-tagged UITokens
                                                → typed HTML blocks
                                                → editable slots

   [Clicks "Email" field      ──────▶     ✏️  Inline Edit:
    → types "Username"]                         • iframe postMessage
                                                 • PATCH /pages/:id
                                                 • glossary updated
                                                                ↓
                                          ↩️  Propagates everywhere:
                                              BRD regenerates,
                                              Excel refreshes,
                                              future AI calls honor it
```

---

## 🧠 The Moat — What Makes This Hard to Copy

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   1️⃣   ROLE-TAGGED RENDERING                                       ║
║       ───────────────────────                                      ║
║       Every UI element carries a semantic role, not just text.     ║
║       Rename "Password Reset" → "Reset Your Password" → "Forgot?"  ║
║       Layout stays identical. Competitors regex on labels; they    ║
║       break the moment a user customizes anything.                 ║
║                                                                    ║
║   2️⃣   VOCABULARY PRESERVATION (THE GLOSSARY)                      ║
║       ────────────────────────────────────────                     ║
║       "You said 'username' → we always say 'username'."            ║
║       Project-wide, across sessions, across exports, across        ║
║       regenerations. LLMs drift; we anchor.                        ║
║                                                                    ║
║   3️⃣   INCREMENTAL REGENERATION                                    ║
║       ──────────────────────────                                   ║
║       Change one sentence → touch one doc section → refresh one    ║
║       prototype page. Not "rebuild everything and pray." 10x       ║
║       cheaper, 10x more accurate.                                  ║
║                                                                    ║
║   4️⃣   LIVE EDIT-STABLE PROTOTYPES                                 ║
║       ─────────────────────────────                                ║
║       Stakeholder edits text directly in the prototype. Changes    ║
║       persist to DB. Docs + exports regenerate with their words.   ║
║       No Figma → dev handoff gap.                                  ║
║                                                                    ║
║   5️⃣   MULTILINGUAL INPUT, CANONICAL STORAGE                       ║
║       ───────────────────────────────────────                      ║
║       Stakeholders speak naturally (Hinglish, Gujarati, English).  ║
║       System stores clean English. Docs stay professional. First   ║
║       platform to bridge this gap for emerging markets.            ║
║                                                                    ║
║   6️⃣   CONFIDENCE TELEMETRY (DEASV)                                ║
║       ──────────────────────────────                               ║
║       Every feature scored on 5 axes:                              ║
║          D - Documentation completeness                            ║
║          E - Elicitation depth (how much probing)                  ║
║          A - Assumption risk                                       ║
║          S - Stability (edit recency)                              ║
║          V - Validation (user-confirmed via quiz)                  ║
║       PMs see exactly what's weak BEFORE the dev sprint starts.    ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 🎬 Before / After — The Value in One Picture

```
  BEFORE BUTTERSTACK                    AFTER BUTTERSTACK
  ──────────────────                    ─────────────────

  Meeting transcript                    Conversation
        ↓                                     ↓
  BA reads (3 days)                     AI listens (real-time)
        ↓                                     ↓
  Rewrites in English                   Preserves your vocabulary
        ↓                                     ↓
  Word doc (2 weeks)       ──────▶      15-section doc (instant)
        ↓                                     ↓
  Figma mockups (1 week)                Live prototype (instant)
        ↓                                     ↓
  Dev handoff meetings                  Shareable link
        ↓                                     ↓
  40% rework                            Zero translation loss
        ↓                                     ↓
  🕒 6 weeks · $80K                     ⚡ 1 hour · $80
```

---

## 📈 Unit Economics (Illustrative)

```
┌────────────────────────────────────┬──────────────┬──────────────┐
│                                    │  INCUMBENT   │ BUTTERSTACK  │
├────────────────────────────────────┼──────────────┼──────────────┤
│  Time to first working prototype   │   2–3 weeks  │  < 15 min    │
│  Cost per requirement document     │   $5K–$15K   │  $20–$80     │
│  Rework rate                       │    ~40%      │   ~5%        │
│  Stakeholder language support      │   English    │  Any mix     │
│  Vocabulary drift across handoffs  │    High      │   Zero       │
│  Exports included (BRD/XLSX/Map)   │   Separate   │  Built-in    │
│  Live shareable prototype          │     No       │   Yes        │
└────────────────────────────────────┴──────────────┴──────────────┘
```

---

## 🚀 Platform Evolution — 3 Horizons

```
     HORIZON 1 (NOW)              HORIZON 2 (6-12 MO)         HORIZON 3 (12-24 MO)
     ─────────────                ───────────────────         ────────────────────

  ✅ Conversation elicitation     🔜 Dev-ready code scaffolds   🔮 Multi-agent review
  ✅ Module/feature/page tree     🔜 QA test generation          🔮 Org-wide glossary
  ✅ Editable live prototypes     🔜 Jira/Linear sync            🔮 Compliance auto-audit
  ✅ BRD / Excel / Mindmap        🔜 Real-time multi-user edit   🔮 Spec → running app
  ✅ Confidence scoring (DEASV)   🔜 Voice-first meetings        🔮 Industry verticals
  ✅ Multilingual input           🔜 Design system per brand     🔮 Enterprise SSO/SOC2
```

---

## 💰 Why Invest Now

```
🎯  MARKET               $50B+ requirements/BA/low-code TAM
🧭  TIMING               LLMs crossed accuracy threshold in 2024
🏗️   MOAT                 Role-tagged, glossary-anchored, event-sourced
🌍  GLOBAL               First platform built for multilingual markets
📊  TRACTION             Functional product, real projects, real users
⚙️   MARGIN               AI cost ~$0.05 / doc — 1000x markup feasible
🔒  DEFENSIBILITY        Every edit improves the glossary → compounding
```

---

## 🧭 The One-Paragraph Mental Model (for board decks)

> **Butterstack captures stakeholder intent as typed, scoped events. A state tree of projects → modules → features → pages becomes the single source of truth. AI writes rich 15-section docs and semantic UI tokens from that tree. A live role-tagged prototype lets any stakeholder edit text directly — edits persist, propagate to docs and exports, and preserve the user's own vocabulary across every future regeneration. Confidence scores surface weakness before development begins. Exports (BRD, Excel, Mindmap, shareable link) ship in seconds. One conversation, zero translation loss, production-ready spec.**
