# Butterstack-2 — Flow of Information

_Bhool ja diagrams aur boxes. Soch information ke **6 ghoomne ke rastey** ke hisaab se. Har rasta ek complete loop hai — ek jagah se shuru hota hai, system ke through travel karta hai, kisi doosri jagah land karta hai, aur kuch project ki state change karke jaata hai._

> **This is the canonical information-architecture document for v2.** Every design decision in `master-plan.md` and every box in `assets/product-flow-whiteboard.md` should collapse down to one of these 6 routes.

---

## 🔄 Rasta 1 — **Intent Ingestion** (Bahar → Andar)

**Kaha se start:** user ke dimaag mein, user ke documents mein, user ki baat mein.

```
User ka intent (Hinglish / Excel / doc / voice)
    ↓
[Streamliner] — slang / local language saaf karta hai
    ↓
Clean English sentence + [Glossary Capture] — user ke unique words yaad rakhe jaate hain
    ↓  ("username" ≠ "email", "employee" ≠ "user")
[Classifier] — ye kis kism ka intent hai decide karta hai
    ↓
Typed Intent emit hota hai:
    • ask          → clarifying question chahiye
    • plan.propose → naya plan banao
    • plan.amend   → existing plan change karo
    • field.update → ek specific doc field change karo
    • reject       → "X mat do"
    ↓
[Event Bus] mein ek typed event append ho jaata hai
```

**Information unit yaha:** raw text → clean text → classified intent → event.
**Is rastey ka kaam:** outside world ka noise ko **typed, scoped event** mein convert karna.

---

## 🌳 Rasta 2 — **State Mutation** (Event → Tree)

**Kaha se start:** Rasta 1 ke end se — ek classified event.

```
Typed Event (jaise "plan.confirm" ya "feature.rename" ya "slot.set")
    ↓
[Validator] — Zod schema check karta hai
    ↓
[State Transaction] — single DB transaction mein:
    • modules insert / update
    • features link
    • pages link
    • page_features connections
    • glossary terms add
    • provenance_events[] append (ye event kis entity ne touch kiya)
    ↓
Commit → [Event Log] mein event stored (append-only, immutable)
    ↓
Event Bus broadcast:
    • WebSocket se FE ko batao
    • [Projector Queue] mein affected entities ke liye projection jobs queue ho jaayi
```

**Information unit yaha:** event → state delta → provenance record.
**Is rastey ka kaam:** tree ko mutate karo, kya badla audit trail mein record karo, aur kis projection ko refresh karna hai batao.

**Key point:** **state tree = single source of truth**. Baaki sab — docs, tokens, prototype, BRD, scores — sab isse derive hota hai. Tree mein jab tak change nahi hui, kuch bhi badla nahi.

---

## 📐 Rasta 3 — **Projection Fan-Out** (State → Derived Artefacts)

**Kaha se start:** Rasta 2 ne queue mein projection job daal diya.

```
Job runner uthaata hai → event.scope check karta hai
    ↓
Scope ke hisaab se specific projections regenerate hote hain (NOT everything):
    ↓
    ├──▶ [Doc Writer]       — ek feature ka ek field refresh (e.g. "validations" only)
    │                          Input: StructuredDoc (typed) + event + glossary
    │                          Output: updated StructuredDoc field
    │
    ├──▶ [Token Extractor]  — ek page ke UITokens refresh
    │                          Input: StructuredDoc + design system + glossary
    │                          Output: typed Block[] (header / form / table / aux)
    │                          Role har block pe stored — label-text classify NAHI hota
    │
    ├──▶ [Confidence Scorer] — DEASV 5 axes recompute
    │                          Input: feature + events + edits + quiz answers
    │                          Output: {D, E, A, S, V, overall}
    │
    └──▶ [Cascade Suggester] — "ye change kahaan kahaan aur impact karega?"
                                Input: event + provenance_events[]
                                Output: Suggestion[] (FE ko WebSocket se)
    ↓
Har step pe `job.step = "..."` update — FE live progress dikha raha hai
    ↓
Projection complete → DB mein stored → WebSocket broadcast: "entity X ka projection Y fresh hai"
```

**Information unit yaha:** event scope → targeted projection → fresh derived artefact.
**Is rastey ka kaam:** **sirf wahi regenerate karo jo stale hai**. Field-scoped. Never "rebuild everything and pray."

**Critical rule:** agar kisi slot pe `source: 'user'` hai, projector **usse touch hi nahi kar sakta**. User ka edit sacred hai.

---

## 👀 Rasta 4 — **Render Pipeline** (State → User ke screen pe)

**Kaha se start:** user ne kuch select kiya ya reload kiya.

```
FE: user feature click karta hai (ya URL pe ?featureId=X refresh karta hai)
    ↓
[Workspace Store] ko pata chala scope change hua
    ↓
REST GET — tree, feature, linked pages (ek hi init endpoint se saare)
    ↓
WebSocket subscribe — "is entity ke updates bhejo"
    ↓
Tokens aa gaye — typed Block[]
    ↓
[Dispatch Renderer] — switch(block.kind):
    • header   → renderHeader()
    • form     → renderForm()
    • table    → renderTable()
    • aux      → renderAux()   ← role se decide, label se nahi
    ↓
HTML string + <slot-edit> custom elements embedded
    ↓
iframe mein inject → user ko live prototype dikh raha hai
    ↓
Har slot-edit element khud ko contenteditable banata hai
    ↓
Doc view parallel mein render — StructuredDoc → cards (har section ek typed card)
```

**Information unit yaha:** state → typed Block[] → HTML → DOM → pixels.
**Is rastey ka kaam:** **pure function**. Same tokens in → same pixels out. Koi regex, koi runtime inference, koi "agar label 'terms' contains then footer" nahi.

---

## ✏️ Rasta 5 — **User Edit Loop** (Pixel → back to Rasta 1)

**Kaha se start:** user ne prototype mein text click kiya.

```
User "Email" label pe click → <slot-edit> element contenteditable hua
    ↓
User type karta hai "Username" → Enter press
    ↓
slot-edit blur emit → iframe postMessage({type:'slot.set', path, value})
    ↓
[Parent Bridge Service] msg receive karta hai
    ↓
[Event Bus] ko bhejta hai:
    POST /api/events
    body: { type: 'slot.set', pageId, path: 'blocks[2].fields[0].name', value: 'Username', source: 'user' }
    ↓
--- ab wapas Rasta 1 / 2 / 3 chalu ---
    ↓
[Validator] → [State Transaction] → slot update + source='user' flag stored
    ↓
[Glossary auto-capture] — "user ne Email → Username rename kiya; glossary mein add"
    ↓
[Event Log] → [Projector Queue]
    ↓
[Cascade Suggester] — ye rename aur kahaan affect karega?
    ↓
WebSocket → FE ko "saved ✓" + "cascade suggestions ready"
    ↓
iframe slot-edit ack receive → "✓" badge dikha deta hai
    ↓
Doc view refresh — BRD / Excel jo saare "Email" likhte the, ab "Username" likhte hain
```

**Information unit yaha:** pixel click → DOM event → typed event → state mutation → projection refresh → pixel update.
**Is rastey ka kaam:** user ka edit poore system mein propagate hota hai **bina translation loss ke**. Glossary mein automatically capture ho jaata hai — iske baad **har future AI call "username" bolegi, kabhi "email" nahi**.

---

## 🔔 Rasta 6 — **Cascade & Attribution** (Event → Impact Web)

**Kaha se start:** koi bhi mutation (Rasta 2 ke end se).

```
Event fire hua — say, Feature "Login" rename hua "Sign In"
    ↓
[Projector] provenance_events[] check karta hai:
    "Is feature ko kin events ne touch kiya? Ye feature kin pages pe linked hai?
     Is feature ka naam kin docs mein mention hai? Kin BRD sections mein hai?"
    ↓
Impact Set compute hoti hai: {feature: Login, pages: [LoginPage], docs: [Login doc], brdSections: [3]}
    ↓
[Cascade Suggester] LLM call (field-scoped, chhota prompt):
    "User ne Login → Sign In rename kiya. Ye references bhi update karein?"
    ↓
Suggestion[] emit hoti hain
    ↓
WebSocket se FE pe diff-preview dikha deta hai:
    ✓ Dashboard doc mein "Go to Login" → "Go to Sign In"
    ✓ User Registration flow mein "back to Login" → "back to Sign In"
    ✗ Unrelated modules untouched
    [Apply] [Cancel per item] [Cancel all]
    ↓
User confirm karta hai → ye bhi events ban ke wapas Rasta 2 mein chale jaate hain
```

**Information unit yaha:** single event → impact web → targeted suggestions → user confirms → cascade events.
**Is rastey ka kaam:** **hidden couplings surface karna**. User ko pata chale ki ek change aur kahaan aur reflect hoga, aur consent leke apply ho — silent regeneration nahi.

---

## 🧠 Inn 6 rastey ka Overall Picture

```
                           ┌─────────────────────────────┐
                           │  🗣 INTENT  (human input)    │
                           └──────────────┬──────────────┘
                                          │ Rasta 1 — Ingestion
                                          ▼
                           ┌─────────────────────────────┐
                           │  📦 TYPED EVENT              │◀──┐
                           └──────────────┬──────────────┘   │
                                          │ Rasta 2 — Mutation│
                                          ▼                   │
                     ┌───────────────────────────────┐        │
                     │  🌳 STATE TREE + EVENT LOG     │        │
                     │     (single source of truth)   │        │
                     └───────────┬───────────────┬───┘        │
                                 │               │            │
                   Rasta 3 ──────┘               └──── Rasta 6│
                   (Projection                   (Cascade     │
                    Fan-out)                      Suggester)  │
                                 │               │            │
                                 ▼               ▼            │
                     ┌───────────────────────────────┐        │
                     │ 📐 PROJECTIONS                 │        │
                     │  • StructuredDoc               │        │
                     │  • UITokens (typed Blocks)     │        │
                     │  • DEASV Score                 │        │
                     │  • Suggestions                 │        │
                     └───────────┬───────────────────┘        │
                                 │ Rasta 4 — Render           │
                                 ▼                             │
                     ┌───────────────────────────────┐        │
                     │  👀 USER'S SCREEN              │        │
                     │  (prototype · doc · BRD)       │        │
                     └───────────┬───────────────────┘        │
                                 │ Rasta 5 — Edit Loop        │
                                 └─────────────────────────────┘
                                          (event banke wapas)
```

---

## 🧭 Yeh Mental Model kyun sahi hai

**Har cheez ek direction mein move karti hai:**
- Information **neeche nahi** jaati layers mein jab tak event banke wapas nahi aati.
- Projections kabhi state ko mutate nahi karti — sirf state se read karte hain.
- Renders kabhi projections ko mutate nahi karte — sirf read karte hain.
- User edits **events banke** wapas Rasta 1 se shuru karte hain.

**Har information unit typed hai:**
- Raw text → Cleaned text → Classified intent → Typed Event → State delta → Typed Projection → Typed Block → DOM → Slot Event → (wapas Typed Event)
- Kabhi bhi free-text ko regex pe throw nahi karte kisi routing decision ke liye.

**Har mutation auditable hai:**
- Event Log append-only. Kisne, kab, kyun kiya — sab trace ho sakta hai.
- `provenance_events[]` har entity pe — "mujhe kis event ne banaya" query 1 second mein.

**Har regeneration scoped hai:**
- Field-level projection calls. Chhote prompts. Accurate outputs. Cheap.
- User-source slots **untouchable**. LLM literally bypass karta hai unhe.

---

## 🎯 The 6 Routes at a Glance

| # | Route | Direction | Input | Output | Scope of Change |
|---|---|---|---|---|---|
| 1 | Intent Ingestion | Outside → Event | Raw user text / file | Typed Event | None yet (just classified) |
| 2 | State Mutation | Event → Tree | Typed Event | State delta + Event log entry | Tree is updated, provenance recorded |
| 3 | Projection Fan-Out | State → Derived | Event + State | StructuredDoc / Tokens / Score / Suggestions | Only affected projections |
| 4 | Render Pipeline | State → Pixels | Typed Blocks + Doc | HTML / DOM | Pure function — no state change |
| 5 | User Edit Loop | Pixels → Event | DOM interaction | Typed Event (loops back to 1) | Restarts at Rasta 1 |
| 6 | Cascade & Attribution | Event → Impact Set | Event + Provenance | Suggestion[] → user confirms → more events | Optional chain of events |

---

## 🔒 Invariants (kabhi tootne nahi dena)

1. **Single write path** — saari mutations `POST /api/events` se jaati hain. No side-channel PATCH endpoints.
2. **Event log is append-only** — events kabhi delete / update nahi hote. Undo = reverse event, not mutation.
3. **State tree is the single source of truth** — projections DB mein cache hain jo rebuild ho sakti hain from (state + events).
4. **`source: 'user'` is sacred** — LLM projector kabhi isse overwrite nahi karega.
5. **Glossary is project-scoped** — har project ka apna vocabulary. Kabhi cross-project leak nahi hota.
6. **Role is stored, never inferred at render time** — `block.role` is set at plan/capture time, frozen.
7. **Provenance is mandatory** — har entity pe `provenance_events[]` — "kaunse events ne mujhe banaya."
8. **Rendering is deterministic** — `(tokens, design, context) → HTML`. Same input, same output, always.
9. **Projections are field-scoped by default** — "rebuild everything" is a smell, never a default.
10. **Cascade is opt-in** — Rasta 6 suggests; user apply karta hai. Silent cascade prohibited.

---

## 🧪 How to test a new feature against this architecture

Agar tu koi naya capability add kar raha hai, puch:

1. **Kaunse rastey ka hissa hai?** (1, 2, 3, 4, 5, ya 6 — ya kai saare?)
2. **Input-output typed hai?** Free-text hai to sahi rasta nahi hai.
3. **Single write path ke through ja raha hai?** Agar nahi, redesign.
4. **`source: 'user'` ke rules follow karta hai?**
5. **Provenance add kar raha hai?** Agar state change ho raha hai, add karo.
6. **Projection scope clear hai?** "Everything" answer ho to bug hai.
7. **User ko dikh raha hai kya chal raha hai?** Rasta 3 ke live steps / Rasta 6 ke suggestions.
8. **Role / glossary ko honor karta hai?** Ya label-text pe regex maar raha hai?

In 8 questions ka sahi jawab aa raha hai to architecture safe hai.

---

## TL;DR — ek line mein flow

> **User bolta hai → system usko typed event banata hai → tree mutate hoti hai → affected projections regenerate hote hain → screen pe render hota hai → user fir edit karta hai → wohi edit ek naya typed event banke wapas flow shuru kar deta hai — aur glossary har step pe user ki vocabulary anchor karke rakhti hai.**

Yahi hai poori Butterstack-2 ki information architecture. **6 rastey. Har rasta typed. Har mutation event-sourced. Har projection scoped. Har render deterministic.**

---

## 📎 Related Documents

- `planning/master-plan.md` — phase-wise build plan, folder structure, DoD
- `planning/assets/product-flow-whiteboard.md` — original whiteboard transcribed
- `planning/assets/investor-architecture.md` — 4-layer pitch view
- `planning/assets/feature-parity.csv` — 80+ capability tracker (v1 → v2)
