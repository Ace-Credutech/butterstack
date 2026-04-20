<!-- converted from Butterstack_Phase1_Product_Definition.docx -->





CONFIDENTIAL — For internal product and development team use only

# 1. Executive Summary
ClarityOS is an AI-powered requirement gathering and prototyping platform built from the ground up on discovery research — not assumptions. Every feature in this document is traceable to a named person who felt a named pain in a real project.


This document covers Phase 1 of ClarityOS: the Requirement Gathering and Prototyping module. It is structured for both the product team (to understand the why behind every decision) and the development team (to understand what needs to be built and why it matters).

## What This Document Contains
- The discovery research foundation — 5 interviews, 3 personas
- The core problem statement derived from real data
- 16 product features across 5 pillars, each with full reasoning
- The user flow showing how features connect into one experience
- Priority framework for v1 development
- The product's competitive differentiation and moat

## The One Sentence That Defines This Product



# 2. Research Foundation
Every product decision in ClarityOS is grounded in direct discovery interviews. No assumptions. No whiteboard hypotheses. The following five interviews were conducted before any feature was defined.

## 2.1  Interview Subjects


## 2.2  How a BA Actually Works — The Real Picture
Understanding the BA's day-to-day reality was essential before defining any feature. The BA role is structurally impossible: they are asked to own the quality of requirements they didn't generate, represent the client to the tech team and vice versa, and carry the entire project's contextual understanding in their head.

### The BA's Core Daily Tensions
- They are translators first — converting vague business intent into precise technical specification
- They manage people, not just documents — stakeholder politics shape every requirement
- They carry invisible knowledge — the most important context lives in their head, not in documents
- They are rewarded for document thickness, not document quality — creating perverse incentives

### Time Distribution (from interviews)


## 2.3  The Three Personas and Their Hidden Realities

### The Business Analyst — Psychological Pressures




### The Project Manager — What Sameer Revealed
Sameer's interview added a dimension the BA interviews couldn't provide: what happens downstream when requirements fail.

- Requirements don't stay broken in requirements — they cascade into planning, execution, and team morale
- 30–40% of a PM's total time exists purely because of requirement failure upstream
- Status reports are never a perfect reflection of reality — PMs report optimistically while privately tracking real risk
- Requirements change through conversations — Slack, verbal mentions, emails — never through formal channels
- By the time a PM discovers a changed requirement, it is already affecting delivery


### The Client — Kamal's Most Honest Admission
The client interview revealed the root cause of most requirement failures. Clients do not present their real operational reality to vendors. They present a sanitised version.





# 3. The Core Problem

## 3.1  The Lossy Chain
Every requirements process is built on the assumption that language is a reliable medium for capturing intent. It is not. Every handoff between personas is a lossy compression:


## 3.2  The Three Gaps Nobody Owns
All five interview subjects identified the same problem from different vantage points. The convergence points to three structural gaps that exist in every project — and that no tool currently addresses:




## 3.3  The Hair-on-Fire Moment
Across all five interviews, one specific moment was identified as the point of maximum pain — the moment that causes projects to derail and trust to break:


This moment happens after weeks of meetings, documentation, and development. By the time it surfaces, the cost of fixing it is measured in weeks of rework, budget overruns, and damaged client relationships. Every BA invented their own workaround to push this moment earlier. Your product makes earlier discovery the default.

## 3.4  The Financial Scale of the Problem



# 4. Product Overview — ClarityOS Phase 1

## 4.1  What ClarityOS Is
ClarityOS is not a better document editor. Every competitor in this space — Confluence, Jira, Notion, and every AI requirements tool — automates the documentation layer. They make the existing broken process faster.

ClarityOS operates at a fundamentally different level. It addresses the human psychology and communication failure that causes requirement problems — not the paperwork that results from them.


## 4.2  The Three Product Moats
Three capabilities separate ClarityOS from every existing tool. These are not features — they are structural advantages that are difficult to replicate without rebuilding from scratch.

### Moat 1 — Claude-Quality Interactive Prototype Generation
Every other requirements tool generates text. ClarityOS generates interactive, styled, clickable software from natural language intake. No competitor does this. The fidelity of the prototype directly controls the quality of client feedback. A client reacting to real software behaviour during elicitation, not weeks later, is the single highest-impact intervention this product makes. Nitya spent her own time building HTML prototypes manually because no tool existed. ClarityOS makes that the default for every BA on day one.

### Moat 2 — The Live Confidence Layer
Every requirement in ClarityOS carries a system-generated, three-axis confidence signal: completeness, stability, and intent fidelity. This signal is live, objective, and requires no manual updating. No tool in the market provides this. Sameer described it as the single thing he most needed after 10 years of PM work. The PM has never had an instrument that shows them the real health of their requirement foundation — only status reports people chose to write.

### Moat 3 — Mess-Safe Elicitation
Kamal told us directly that clients present a cleaned-up version of their operations because showing the mess feels like weakness. ClarityOS is the first tool designed to make revealing the real, messy, exception-heavy operational truth feel safe. The elicitation mode is specifically designed to normalise complexity and reward honesty. This extracts the requirements that every other tool misses — the ones that live in the gap between the official process and how work actually happens.


# 5. Feature Definitions — All 16 Features
Features are organised across five pillars. Each feature includes: what it does, why it exists (traced to interview data), how it works at a functional level, and what it replaces or eliminates.


The elicitation agent is the conversational AI that conducts intake from the client. It is the product's most visible capability and its most important psychological design challenge. The agent must feel like the most experienced BA in the room — not like a chatbot filling out a form.

### Feature 1.1 — AI Elicitation Agent with Why-Chain Excavation

What It Does
A conversational AI agent that conducts asynchronous requirement intake. The agent does not ask 'what do you want?' It asks 'why does this matter?' and follows every answer with a deeper probe until the underlying business need — not the surface feature request — is captured. The agent is designed for asynchronous use so the client answers without the social pressure of a live meeting.

Why It Exists — The Interview Evidence
- Kamal (Client): 'A vendor would earn trust if they ask more why questions and challenge us when something doesn't make sense.' — Direct design brief from the buyer.
- Inaleo (Senior BA): Invented a 'parallel reality map' — two versions of requirements (stated vs actual) — because no tool helped capture the gap between the two.
- Nitya (BA): 'The biggest human problem is lack of clarity combined with assumptions. People assume others understand what they mean.'

How It Works — Functional Behaviour
- Client enters a project name and initial description in plain language
- Agent responds with the first why-probe: 'What problem are you trying to solve for your team — what happens today that doesn't work?'
- Each answer triggers a follow-up based on what was said and what was not said
- Agent uses pattern recognition to detect filtered, vague, or politically-shaped answers and probes deeper
- Agent maintains conversation context across sessions — the client can return over multiple days
- All responses are stored, tagged, and fed into the requirement graph in real time

What It Replaces
The traditional requirements meeting — where the BA conducts a live interview, the client performs confidence they don't have, and the BA writes down what was performed rather than what was meant.

### Feature 1.2 — Mess-Safe Elicitation Mode

What It Does
A dedicated elicitation mode that explicitly normalises messy, unstructured, exception-heavy operational reality. Asks about how things go wrong, not just how they should work. Uses language that makes revealing imperfect processes feel valuable rather than embarrassing.

Why It Exists — The Interview Evidence

This is the root cause of most project failures. The requirement the BA receives has already been filtered through the client's internal politics, budget anxiety, and legacy embarrassment. The resulting document is accurate to the performance, not to reality.

How It Works — Functional Behaviour
- After initial intake, agent activates mess-safe prompts: 'Walk me through what happens when this process breaks down. What's the messiest part of this workflow?'
- Agent explicitly validates complexity: 'It's really helpful to understand the exceptions — that's often where systems fail.'
- Responses from this mode are tagged as operational-reality data and weighted higher in confidence scoring
- Agent detects when answers are suspiciously clean and re-probes: 'You've described the ideal flow — what actually happens on a difficult day?'

What It Eliminates
The systematic under-specification of edge cases and exceptions that causes 'technically delivered but operationally wrong' outcomes — the exact failure Kamal described in his project.

### Feature 1.3 — Multi-Stakeholder Independent Capture with Contradiction Detection

What It Does
Each stakeholder completes their own independent elicitation before any group synthesis occurs. The system automatically surfaces contradictions between stakeholders and presents them as objective system findings — not as interpersonal conflict.

Why It Exists — The Interview Evidence
- Payal (Director): Described 'misaligned stakeholders with equal authority' — Finance wanting flexibility, Operations wanting control, Leadership wanting visibility — all pulling requirements in different directions.
- Sameer (PM): 'Different stakeholders had different interpretations — this creates ambiguity, rework, and delays.'
- Kamal (Client): 'The final say is not always with one person — it's a mix of senior management, operational heads, and end-user feedback.'

How It Works — Functional Behaviour
- Project lead invites multiple stakeholders via email link — each receives their own intake session
- Stakeholders cannot see each other's answers during elicitation
- After all stakeholders complete intake, the system synthesises and identifies: (a) aligned requirements, (b) partial contradictions, (c) direct conflicts
- Contradictions presented as: 'Operations describes this workflow as flexible. Leadership describes it as a fixed approval sequence. This needs a decision before prototyping.'
- Contradiction report shared with project lead — not broadcast to all stakeholders



The prototype engine is ClarityOS's most visible competitive differentiator. No requirement tool generates Claude-quality interactive UI from natural language intake. This capability fundamentally changes when in the process clients discover what they actually mean — shifting discovery from months to minutes.

### Feature 2.1 — Progressive Claude-Quality UI/UX Prototype Generation

What It Does
As elicitation reaches sufficient fidelity on any feature, an interactive, styled, clickable prototype of that feature is automatically generated. Not a wireframe. Not a static mockup. A real, interactive UI component the client can navigate. The prototype is generated progressively — feature by feature — so clients react to working software within the first session.

Why It Exists — The Interview Evidence

Nitya invented this workaround herself — at 3.5 years of experience — because no tool existed. She was building prototypes manually in VS Code. Inaleo used scenario-based walkthroughs to achieve the same effect. Payal ran iterative feedback loops. All three independently solved the same problem: clients cannot evaluate what they cannot see.

Why Claude-Quality Matters
The fidelity of the prototype directly controls the quality of the feedback. A low-fidelity wireframe with grey boxes invites feedback about aesthetics and layout. A high-fidelity interactive UI with real data, real interactions, and professional visual design invites feedback about behaviour, workflow, and business logic. The latter is what requirement gathering actually needs.

How It Works — Functional Behaviour
- As requirement nodes reach a confidence threshold in elicitation, prototype generation is triggered automatically
- Agent generates a styled, interactive React component that implements the described behaviour
- Client sees a live preview embedded directly in their intake session — no separate tools needed
- Prototype includes: realistic data, interaction states, error states, and the edge cases captured in mess-safe mode
- Multiple prototypes build progressively as more features are elicited
- Full prototype can be previewed as a navigable flow before requirements are finalised

What It Eliminates
The prototype review crisis — the late-stage moment when a client sees a first prototype and says 'that's not what I meant,' triggering expensive rework. That moment happens in the first session with ClarityOS, not after weeks of development.

### Feature 2.2 — Structured Prototype Reaction Capture

What It Does
When a client views a prototype, their feedback is captured through structured functional prompts — not open-ended approval requests. The system asks specific, answerable questions about behaviour and workflow rather than 'do you approve this?' Soft or non-committal feedback is explicitly flagged as incomplete and re-prompted.

Why It Exists — The Interview Evidence

How It Works — Functional Behaviour
- After prototype view, system presents structured reaction prompts: 'Does this match how exceptions are handled in your team?', 'Are there situations where users would take a different path than shown?'
- Flexibility vs. rigidity detector: every workflow prototype is specifically probed for whether it accommodates real-world variation
- Soft responses ('looks good', 'seems fine') trigger a re-prompt: 'On a scale of 1-5, how closely does this match how your team would actually use it? What would need to be different for it to be a 5?'
- Reactions are stored as requirement updates — not separate feedback — and immediately reflected in the confidence score of affected requirements



The confidence system is the invisible infrastructure that makes ClarityOS fundamentally different from every other requirements tool. Every requirement carries a live, system-generated signal that tells all stakeholders how much they can trust what is written — without asking anyone, without holding a meeting, without updating a spreadsheet.

### Feature 3.1 — Three-Axis Confidence Signal Per Requirement

What It Does
Every requirement in ClarityOS is scored live across three independent axes. Each axis is system-generated — never manually updated — and each drives different actions when its score is low.


Why Three Axes, Not One Score
A single completeness score — as originally conceived — collapses three different problems into one number and loses actionability. A requirement can be complete (all fields filled), unstable (likely to change next week), and low fidelity (it was filled in from a performance, not from real intent). Each problem has a different owner and a different fix. One score hides all of this. Three axes surface it.

### Feature 3.2 — Assumption Auto-Tagging and Surfacing

What It Does
The AI automatically identifies statements within requirements that contain hidden assumptions — conditions that must be true for the requirement to make sense — and tags them as explicit, challengeable, ownable objects. Assumptions are never buried in requirement prose.

Examples of Assumptions Automatically Detected
- 'Users will always have a stable internet connection' — embedded in an online-only workflow requirement
- 'The approver is always available within 24 hours' — embedded in an approval workflow requirement
- 'All users have been trained on the current process' — embedded in a migration requirement


How It Works — Functional Behaviour
- NLP analysis identifies conditional language, implicit dependencies, and unstated preconditions in all requirement text
- Each detected assumption is surfaced as a tagged object with: assumption text, the requirement it underpins, a suggested validation question, and an owner field
- Assumptions are shown to both the BA (to validate or challenge) and the client (to confirm or correct)
- Unvalidated assumptions reduce the intent fidelity score of their parent requirement



The BRD is not a template someone fills in at the end of elicitation. It is a live artefact that builds itself as the agent works. By the time elicitation is complete, the BRD is 80% written. The BA reviews and refines — never writes from scratch. This collapses Nitya's single biggest time sink: the 25% of her week spent on documentation.

### Feature 4.1 — Auto-Generated Living BRD

What It Does
A Business Requirements Document that builds itself in real time as the elicitation agent works. The BRD contains all sections a professional BA would include — and specifically matches the template structure Nitya independently invented as her personal workaround.

BRD Sections Auto-Populated



Nitya built this template herself. ClarityOS automates it. The sections she defined are exactly the sections the auto-generated BRD contains — validated by real-world BA practice, not by product assumption.

### Feature 4.2 — Layered Stakeholder Views from One Data Source

What It Does
The same underlying requirement data is automatically rendered in three distinct formats for three distinct audiences. One truth. Three views. No manual reformatting.



Payal invented this layered view system herself — as a workaround — after 15 years of watching single-format documents fail different audiences. ClarityOS makes it automatic.

### Feature 4.3 — Embedded Reasoning Per Requirement

What It Does
Every requirement stores not just what was decided, but why. The reasoning layer includes: the business need the requirement serves, the stakeholder who drove it, the alternative approaches that were considered and rejected, the concern that shaped its current form, and its change history.

Why It Exists — The Interview Evidence
- Payal (Director): 'In many cases, the real requirement is tied to internal politics, control over processes, fear of change. You can't document that directly — but you translate it into a legitimate system feature.'
- Inaleo (Senior BA): Invented a parallel reality map to track the gap between stated requirements and actual needs — because this information was never captured anywhere formally.

Impact on Development
When a developer questions a requirement in sprint 5, they don't need to find the BA who has moved on to another project. They access the full reasoning from day 1 of elicitation. The BA's mental model travels intact through every handoff.



The PM layer is where the financial ROI of ClarityOS is most visible. Sameer's 30–40% waste estimate is the headline of the business case. The PM features convert that waste into saved time, earlier risk visibility, and a status signal that reflects reality rather than what someone chose to report.

### Feature 5.1 — Live Requirement Tracker

What It Does
A structured, live requirement tracker with familiar spreadsheet-like UX — rows, status columns, comment threads. But unlike a spreadsheet, it is automatically populated from agent activity, accessible natively by the client for comments, and never requires manual status updates. Status reflects what the system knows, not what someone remembered to type.

Why Your Original Idea Was Right — and Why It Needed Elevation
The Excel auto-complete idea captured the right UX instinct: familiar, low-friction, structured. The problem with Excel itself is that requirement changes happen outside it — in Slack, verbally, in emails — and nobody updates the spreadsheet. ClarityOS takes the Excel familiarity and makes it live, embedded, and agent-populated.

Columns Auto-Populated by the System
- Requirement ID and title
- Three-axis confidence score (completeness / stability / intent fidelity)
- Current status: Eliciting / Confirmed / In Review / Changed / Invalidated
- Last validated date and by whom
- Open assumptions count
- Informal changes pending review
- Client comment thread (client can add comments directly from their view)

### Feature 5.2 — PM Health Dashboard

What It Does
A PM-specific dashboard showing the true health of the requirement foundation — derived automatically from system activity. No meetings needed to populate it. No manual status updates. The gap between what a PM reports and what they actually believe — eliminated.

Dashboard Panels
- Overall requirement confidence — aggregate score across all requirements
- High-risk requirements — those with low stability or low intent fidelity scores
- Staleness map — requirements not validated in the last N days
- Open assumptions — total count and by requirement area
- Informal changes pending — changes flagged but not yet formally processed
- Stakeholder alignment gaps — where multi-stakeholder capture showed contradictions


### Feature 5.3 — Informal Change Capture and Scope Impact Radar

What It Does
A lightweight mechanism for capturing changes that happen outside formal channels. Any change — mentioned in a meeting, in Slack, over email — is captured in seconds and attached to the affected requirement. The scope impact radar immediately shows every downstream dependency affected by the change.

Why It Exists — The Scope Creep Anatomy
Sameer described scope creep in precise detail: it starts with a client saying 'this is a small addition' in a meeting. The team accommodates it verbally. Nobody updates the requirements document. The addition accumulates with others like it. Timelines slip while scope is officially unchanged. The crisis arrives weeks later, fully formed, when it is too expensive to address cleanly.

- Stage 1 — Change mentioned: 'Can we also add export to Excel?' in a meeting
- Stage 2 — Informal accommodation: team says yes, nobody documents it
- Stage 3 — Accumulation: five similar additions accumulate invisibly over two weeks
- Stage 4 — Cascade: timeline slips but scope is officially unchanged — PM cannot explain why
- Stage 5 — Crisis: difficult client conversation, re-baselining, some features cut

ClarityOS intercepts at Stage 1. The moment a change is mentioned, it is captured, attached to a requirement, and its impact is immediately visible. No change is invisible. No accumulation goes unnoticed.

### Feature 5.4 — Decision Owner and Authority Tracking

What It Does
Every requirement is tagged with: who agreed to it, their authority level (operational, management, executive), and whether it is still subject to higher-level approval. Requirements without stable decision owners are flagged as incomplete. When a higher-authority stakeholder overrides a previously agreed requirement, all downstream dependencies are automatically surfaced.


### Feature 5.5 — Context-Rich Handoff Package

What It Does
When requirements are handed to development, they receive not a document but a living requirement graph. Every specification carries: its reasoning, its confidence score, its open assumptions, its change history, and a direct link to the prototype component that represents it. The BA's full mental model travels intact to development.

- Developers can query any requirement for its full reasoning context
- All assumptions are visible — developers know what the requirement assumes to be true
- Change history shows every evolution of the requirement and why it changed
- Prototype link lets developers see the intended UI behaviour without asking the BA


# 6. Complete Feature Summary



# 7. The User Flow — End-to-End Experience
The following flow shows how all 16 features connect into a single user experience. This is not a technical architecture — it is the experience flow from the perspective of the three personas.



# 8. Founder Ideas — Analysis and Integration
The following six ideas were contributed by the product founder and analysed against the interview data. Each is assessed for how well it maps to real pain, whether it needs expansion, and how it was integrated into the final feature set.



# 9. Competitive Differentiation



# 10. What Not To Build — Equally Important
All five interview subjects gave the same closing advice, independently and unprompted. This section is as important as the feature definitions.






# 11. v1 Build Priority — The Thinnest Slice That Proves Everything
You do not build all 16 features for v1. You build the one flow that demonstrates the core insight to an early user in a single session. That flow is: intake conversation → prototype generated → client reacts → requirements captured with confidence signal.

## 11.1  The v1 Core — 10 Features
- Feature 1.1 — AI Elicitation Agent with Why-Chain Excavation
- Feature 1.2 — Mess-Safe Elicitation Mode
- Feature 1.3 — Multi-Stakeholder Independent Capture
- Feature 2.1 — Progressive Claude-Quality Prototype Generation
- Feature 2.2 — Structured Prototype Reaction Capture
- Feature 3.1 — Three-Axis Confidence Signal
- Feature 3.2 — Assumption Auto-Tagging
- Feature 4.1 — Auto-Generated Living BRD
- Feature 5.1 — Live Requirement Tracker
- Feature 5.2 — PM Health Dashboard

## 11.2  The v1 Demo Session — What It Must Prove
A single demo session must show the following sequence end to end:

- Client describes a project idea in natural language — conversational, no forms
- Agent asks why-chain questions — the client feels understood, not interviewed
- A live, styled, interactive prototype appears — the client sees what was meant, not what was written
- Client gives structured feedback — assumptions surfaced, flexibility probed
- Requirements appear with confidence scores — the PM sees real health, not reported health
- BRD section is 80% written — the BA reviews, does not write from scratch

That single session — done well — is the proof of concept, the investor pitch, and the first customer conversation simultaneously.


# 12. Non-Negotiable Design Principles
These principles are derived directly from interview psychology and must govern every product and development decision. They are not guidelines — they are constraints.

### Principle 1 — Remove the Meeting Room Dynamic
Async-first elicitation. People think and communicate differently outside the social pressure of a live meeting. ClarityOS captures requirements in contexts where people are candid, not performing. Live meeting support is secondary — always.

### Principle 2 — Never Ask for a Decision, Ask for a Reaction
Clients cannot make abstract decisions about software. They can react to something concrete. Always show before asking. The prototype is not the output of requirements — it is the instrument of elicitation.

### Principle 3 — Separate Stakeholders Before Synthesising
Capture inputs from each stakeholder independently before any group alignment. Contradictions surfaced by the system are far less politically charged than contradictions surfaced in a meeting room.

### Principle 4 — Make Changing Your Mind Free
The biggest dysfunction in requirements is the social cost of changing requirements. If the client feels judged for changing their mind, they will hide changes until they become crises. ClarityOS must make iteration feel normal, expected, and costless.

### Principle 5 — Externalise the BA's Mental Model Continuously
The most valuable thing a BA has is their contextual understanding. ClarityOS must capture this in real time — not as documentation but as reasoning attached to requirements. Why was this decided? What was the alternative? What concern drove this?

### Principle 6 — Give the PM Real Visibility, Not Dashboard Theatre
PMs have learned to distrust dashboards because they are manually updated and always lag reality. Every metric in the PM dashboard must be automatically derived from ground truth — no manual status updates, no RAG ratings that require a meeting to discuss.


# Appendix — Interview Quotes by Feature
The following quotes are provided for the product and development team to understand the human reality behind each feature. These are real people describing real problems. Every feature exists because of this evidence.

### On Why Documentation Is Not the Problem



### On the Prototype as the Real Instrument


### On Real-Time Visibility


### On What Would Earn Client Trust

### On the Cascade Effect



ClarityOS — Phase 1 Product Definition
Built from discovery. Every feature traced to a real person and a real pain.
CONFIDENTIAL — For internal product and development team use only
| ClarityOS
Phase 1 Product Definition
Requirement Gathering + Prototyping Module |
| --- |
| Document Type
Product Strategy Document | Research Basis
5 Discovery Interviews |
| --- | --- |
| Personas Researched
BA · PM · Client | Features Defined
16 across 5 Pillars |
| --- | --- |
| Core Insight | The problem is not that requirements are wrong. The problem is that nobody — BA, PM, or client — ever knows how wrong they are, or when they became wrong, until it is too expensive to fix. ClarityOS makes that confidence visible, live, and objective for the first time. |
| --- | --- |
| A system that replaces performed confidence with real confidence — making the gap between intent and understanding visible to every stakeholder, in real time, early enough to act. |
| --- |
| Name | Role / Experience | Domain |
| --- | --- | --- |
| Nitya | Business Analyst, 3.5 years | Tech, Software, Education |
| Inaleo | Senior Business Analyst, 8 years | Enterprise Finance, Operations |
| Payal | BA Director, 15 years | Education, Finance, Logistics |
| Sameer | Senior Project Manager, 10 years | Education, Enterprise Tech |
| Kamal | Operations Head / Client, 20+ years | Operations, Internal Systems |
| Time Spent On | Characterisation |
| --- | --- |
| Client discussions and requirement gathering (~30%) | High value |
| Documentation — BRDs, formatting, updates (~25%) | Necessary waste |
| Clarification loops between client and developers (~20%) | Unnecessary waste |
| Validation and testing support (~15%) | High value |
| Rework due to unclear requirements (~10%) | Unnecessary waste — eliminable |
| The Imposter Spiral | A BA walks into a banking project needing to appear credible in banking, next week healthcare, next month logistics. This creates anxiety that manifests as over-documentation — writing exhaustively to prove understanding rather than because exhaustive docs are useful. |
| --- | --- |
| The Approval Trap | BAs are people-pleasers by professional selection. Over time this creates a dangerous bias — they hear what stakeholders want them to hear. Challenging a senior stakeholder feels like social suicide. So they document requirements they know are wrong. |
| --- | --- |
| The Silent Knowledge Hoard | The most dangerous BA behaviour: they build a rich mental model over months and almost none of it makes it into documents. The knowledge in their head feels obvious to them. When they leave, institutional knowledge evaporates. |
| --- | --- |
| "Real-time visibility into requirement stability — what's confirmed, what's assumed, what's likely to change — that clarity would improve planning significantly."
— Sameer, Senior PM |
| --- |
| The Cleaned-Up Brief | Clients hide: internal disagreements (representing a position they don't agree with), budget constraints (avoiding cost discussions), and legacy embarrassment (presenting a clean version of messy processes). The requirement the BA receives has already been filtered through all three. |
| --- | --- |
| Softened Feedback | When a prototype feels wrong, clients stay quiet. They assume the team has invested effort. They're unsure how to explain the issue. They don't want to slow things down. So issues only surface later — more expensive to fix. |
| --- | --- |
| "Sometimes we don't want to appear unsure in front of the vendor, so we present things with more confidence than we actually feel."
— Kamal, Operations Head |
| --- |
| Transfer Point | What Is Lost |
| --- | --- |
| Client's mental model → What client says | Articulation gap — vague language, assumed context, political filtering |
| What client says → What BA documents | Interpretation gap — BA's domain bias, approval pressure, assumptions |
| BA's document → What PM plans against | Context gap — reasoning, confidence levels, and caveats not transferred |
| PM's plan → What developer builds | Intent gap — requirements answered as written, not as meant |
| What's built → What client expected | Reality gap — the prototype moment of shock, arriving late and expensively |
| Gap 1: Client → BA | Filtered communication. The client presents a cleaned-up, politically-shaped, confidence-inflated version of their operational reality. The BA elicits from a performance, not from truth. The document captures the performance. |
| --- | --- |
| Gap 2: BA → PM | Context loss at handoff. The document transfers the what but not the why, the reasoning, the alternatives rejected, or the confidence level of each requirement. The PM inherits a document they didn't build and cannot fully trust. |
| --- | --- |
| Gap 3: PM → Client | Status distortion. What the PM reports and what the PM believes are two different realities. Risk stays hidden because surfacing it creates panic. By the time problems are visible, they are expensive. |
| --- | --- |
| The client sees the prototype and says: "That's not what I meant." |
| --- |
| Metric | Data Point |
| --- | --- |
| PM time wasted on requirement fallout | 30–40% of total PM time (Sameer, direct admission) |
| BA time on unnecessary waste | ~30% — rework + repeated clarifications (Nitya, Inaleo) |
| Industry estimate — req. rework cost | 30–50% of total project cost (widely documented) |
| On a Rs. 1 Cr project | Rs. 30–50 Lakh of waste traceable to requirements |
| Primary cause | Nobody knows how wrong requirements are until it's too expensive to fix |
| What existing tools do | What ClarityOS does |
| --- | --- |
| Make document writing faster | Make the real intent visible before writing begins |
| Store and organise requirements | Track the confidence and stability of every requirement live |
| Generate text from prompts | Generate interactive prototypes from natural language intake |
| Provide document templates | Auto-build the BRD as elicitation happens — not after |
| Flag missing fields | Surface hidden assumptions, filtered communication, and contradictions |
| PILLAR 1 — ELICITATION AGENT |
| --- |
| v1 Core  |  Your Idea 1 + 4  |  Confirmed by: Kamal, Inaleo |
| --- |
| v1 Core  |  Interview-Derived  |  Confirmed by: Kamal, Inaleo |
| --- |
| "Legacy issues — sometimes our current processes are messy, and we present a cleaner version. Also, sometimes we don't want to appear unsure in front of the vendor, so we present things with more confidence than we actually feel."
— Kamal, Operations Head |
| --- |
| v1 Core  |  Interview-Derived  |  Confirmed by: Payal, Sameer, Kamal |
| --- |
| PILLAR 2 — PROTOTYPE ENGINE |
| --- |
| v1 Core  |  Your Idea 2  |  Confirmed by: Nitya, Kamal, all BAs |
| --- |
| "I started building basic prototypes using HTML, CSS, and JavaScript in VS Code. They're not perfect, but they're good enough to visually show the client what the system will look like. This significantly improved requirement clarity and reduced change requests."
— Nitya, BA 3.5 years |
| --- |
| v1 Core  |  Interview-Derived  |  Confirmed by: Kamal |
| --- |
| "Saying 'this isn't right' is not always easy. You assume the team has already invested effort. You're not always sure how to explain the issue. You don't want to slow things down. So sometimes feedback is softer than it should be, and issues only become clear later."
— Kamal, Operations Head |
| --- |
| PILLAR 3 — CONFIDENCE AND COMPLETENESS SYSTEM |
| --- |
| v1 Core  |  Your Idea 3 — Expanded  |  Confirmed by: Sameer, Inaleo, Nitya |
| --- |
| Axis | What It Measures | When Low — Action Required |
| --- | --- | --- |
| Completeness | Are all required fields captured? Logic, validations, error messages, edge cases, acceptance criteria, UI/UX behaviour. | Agent probes for missing fields. BA is shown exactly what sections are incomplete. |
| Stability | How likely is this requirement to change? Based on: recency of validation, stakeholder alignment score, and number of informal changes logged. | PM is flagged. Requirement is marked as high-risk for sprint planning. Validation re-triggered. |
| Intent Fidelity | Does this requirement capture what was meant, not just what was said? Based on: why-chain depth, mess-safe confirmation, and prototype reaction score. | Agent re-probes the underlying need. Prototype adjusted. Stakeholder asked to confirm against a revised version. |
| v1 Core  |  Interview-Derived  |  Confirmed by: Nitya, Inaleo |
| --- |
| "The biggest human problem in requirements gathering is lack of clarity combined with assumptions. People assume others understand what they mean, but they don't communicate it clearly."
— Nitya, BA 3.5 years |
| --- |
| PILLAR 4 — LIVING BRD AND REQUIREMENT GRAPH |
| --- |
| v1 Core  |  Your Idea 6  |  Confirmed by: Nitya (direct workaround match) |
| --- |
| Section | Content Auto-Generated From | BA Action Required |
| --- | --- | --- |
| Business Context | Why-chain excavation responses | Review and refine framing |
| Functional Requirements | Elicitation agent synthesis | Validate completeness |
| Logic and Business Rules | Agent-extracted rule patterns | Confirm edge cases |
| Assumptions | Auto-tagged assumption objects | Validate or challenge each |
| Acceptance Criteria | Prototype reaction confirmations | Approve or modify |
| Validations | Edge case and error path elicitation | Review coverage |
| Error Messages | Error state prototype generation | Approve language |
| UI/UX Specifications | Prototype components generated | Review fidelity |
| Impact Assessment | Dependency graph analysis | Confirm scope |
| Open Questions | Low-confidence requirement flags | Resolve before development |
| "I created my own BRD template with strict sections: logic, assumptions, impact, validations, error messages, acceptance criteria. During client meetings, I fill this out in real time. It helps both me and the client think through the functionality in detail."
— Nitya, BA 3.5 years |
| --- |
| v1 Full  |  Interview-Derived  |  Confirmed by: Payal (direct workaround match) |
| --- |
| Audience | View Auto-Generated |
| --- | --- |
| Leadership / CXO | Outcome and business impact summary — what this delivers and why it matters. No technical detail. 2–3 sentences maximum per requirement. |
| Operations / End Users | Workflow-level description — how this affects day-to-day work, what processes change, what exceptions are handled. |
| Development / QA | Technical specification — logic, validations, error messages, edge cases, acceptance criteria, API dependencies. |
| "Different stakeholders need different levels of detail — leadership needs outcomes and impact, operations needs workflows, tech needs logic and edge cases. I ensure requirements are structured in layers instead of a single format for everyone."
— Payal, BA Director |
| --- |
| v1 Full  |  Interview-Derived  |  Confirmed by: Payal, Inaleo |
| --- |
| PILLAR 5 — PM CONTROL AND CHANGE MANAGEMENT |
| --- |
| v1 Core  |  Your Idea 5 — Elevated  |  Confirmed by: Sameer |
| --- |
| v1 Core  |  Interview-Derived  |  Confirmed by: Sameer |
| --- |
| "At any given time, some requirements are solid, some are partially understood, some have already changed informally. The challenge is that requirements don't always change officially — they change through conversations. By the time it surfaces, it's already affecting delivery."
— Sameer, Senior PM |
| --- |
| v1 Full  |  Interview-Derived  |  Confirmed by: Sameer, Kamal |
| --- |
| v2  |  Interview-Derived  |  Confirmed by: Kamal, Payal |
| --- |
| "What I approve may still change based on leadership input. End users may react differently once they start using the system. So even if requirements are 'finalised,' they're not truly final."
— Kamal, Operations Head |
| --- |
| v2  |  Interview-Derived  |  Confirmed by: Payal, Sameer |
| --- |
| Feature | Priority | Origin | Interview Source |
| --- | --- | --- | --- |
| AI Elicitation Agent — Why-Chain Excavation | v1 Core | Both | Kamal, Inaleo, Nitya |
| Mess-Safe Elicitation Mode | v1 Core | Interview | Kamal, Inaleo |
| Multi-Stakeholder Independent Capture | v1 Core | Interview | Payal, Sameer, Kamal |
| Progressive Claude-Quality Prototype Generation | v1 Core | Both | Nitya, Kamal, all BAs |
| Structured Prototype Reaction Capture | v1 Core | Interview | Kamal |
| Three-Axis Confidence Signal | v1 Core | Both | Sameer, Inaleo, Nitya |
| Assumption Auto-Tagging and Surfacing | v1 Core | Interview | Nitya, Inaleo |
| Auto-Generated Living BRD | v1 Core | Both | Nitya (workaround match) |
| Live Requirement Tracker | v1 Core | Both | Sameer |
| PM Health Dashboard | v1 Core | Interview | Sameer |
| Layered Stakeholder Views (3 auto-formats) | v1 Full | Interview | Payal (workaround match) |
| Embedded Reasoning Per Requirement | v1 Full | Interview | Payal, Inaleo |
| Flexibility vs. Rigidity Detector | v1 Full | Interview | Kamal |
| Informal Change Capture + Impact Radar | v1 Full | Interview | Sameer, Kamal |
| Decision Owner and Authority Tracking | v2 | Interview | Kamal, Payal |
| Context-Rich Handoff Package | v2 | Interview | Payal, Sameer |
| Step | Action | What ClarityOS Does | Features Active |
| --- | --- | --- | --- |
| 1 | Client describes project | Agent begins why-chain excavation. Mess-safe mode activates. Async — no meeting needed. | 1.1, 1.2 |
| 2 | More stakeholders invited | Each answers independently. System captures all views separately. | 1.3 |
| 3 | Contradictions surface | System identifies where stakeholders diverge. Presents as findings, not conflict. | 1.3 |
| 4 | Prototype begins generating | As features reach confidence threshold, interactive UI is generated progressively. | 2.1 |
| 5 | Client reacts to prototype | Structured reaction prompts capture functional feedback. Soft responses re-prompted. | 2.2 |
| 6 | Requirements crystallise | Each requirement gets confidence score, assumption tags, and embedded reasoning. | 3.1, 3.2, 4.3 |
| 7 | BRD writes itself | All BRD sections auto-populated from agent activity. BA reviews — does not write. | 4.1 |
| 8 | Views generated | Leadership, operations, and development views auto-rendered from one data source. | 4.2 |
| 9 | PM dashboard goes live | Real health of requirements visible to PM — no manual updates required. | 5.1, 5.2 |
| 10 | Changes captured live | Any informal change captured and impact-assessed immediately. | 5.3 |
| 11 | Handoff to development | Full requirement graph with reasoning, confidence, and prototype links transferred. | 4.3, 5.5 |
| Your Idea | Verdict | How It Was Integrated |
| --- | --- | --- |
| Clarification questions for crystal clear requirements | ELEVATED — Right instinct, too shallow as framed. The real job is excavation, not clarification. | Became Feature 1.1 — Why-chain excavation agent. Goes beyond gap-filling to surface what was never said. |
| Claude-quality UI/UX control on prototypes | CONFIRMED AND ELEVATED — This is the product moat. No competitor does this. | Became Feature 2.1 — The core differentiator. Interactive, styled, Claude-quality UI from natural language. |
| Requirements completeness score | EXPANDED — Correct but one-dimensional. | Became Feature 3.1 — Three-axis signal: completeness + stability + intent fidelity. Each axis is independently actionable. |
| Agent for requirement gathering and prototyping | CONFIRMED — Validated by all five interviews. | The architectural spine. Features 1.1 through 4.1 all run on this agent. Personality design is as critical as technical function. |
| Excel auto-complete with status and comments | MERGED AND ELEVATED — Right UX instinct, wrong format. | Became Feature 5.1 — Live requirement tracker: Excel familiarity + agent-powered live data + client commenting built in. |
| BRD with proper format — assumptions, AC, validations, errors, logic, UI/UX | CONFIRMED — Nitya invented exactly this template herself as a workaround. | Became Feature 4.1 — Auto-generated living BRD. Same sections Nitya defined. Builds itself during elicitation, not after. |
| Competitor / Category | What They Do vs What ClarityOS Does |
| --- | --- |
| Confluence / Notion | Better document templates and organisation. ClarityOS: no documents — a living requirement graph that builds itself. |
| Jira / Linear | Ticket and sprint management. ClarityOS: upstream confidence signals that prevent the broken tickets from being created. |
| AI writing tools (general) | Generate requirement text from prompts. ClarityOS: generates interactive prototypes from natural language, not text. |
| AI requirement tools (new entrants) | Automate BRD writing. ClarityOS: surfaces the human communication failure that makes BRDs wrong — not just faster to write. |
| Figma / Balsamiq | Design and wireframing. ClarityOS: generates interactive UI during elicitation, as the feedback instrument — not as a deliverable. |
| None | Three-axis live confidence layer on every requirement. This does not exist in any product currently on the market. |
| Do Not Build | A better document editor. The entire existing market is building faster, smarter document editors. This is a solved problem in a crowded space. ClarityOS must not have a 'write requirements here' text editor as its primary interface. |
| --- | --- |
| Do Not Build | A tool that replaces the BA. Every interviewee — including the most senior ones — said AI should support, not replace, human client interaction. A tool that tries to remove the BA will not be trusted or adopted. Design every feature as AI-assisted, not AI-autonomous. |
| --- | --- |
| Do Not Build | A heavy process layer. Sameer said explicitly: 'If it adds process overhead, it won't be accepted.' Every feature must feel lighter than what it replaces, not heavier. The informal change capture must take 5 seconds. The prototype reaction must take 2 minutes. Friction is the enemy of adoption. |
| --- | --- |
| Do Not Build | A tool that requires the client to learn new behaviour. Kamal's onboarding experience must feel like a conversation, not software training. If a client needs to be taught how to use ClarityOS, the design has failed. |
| --- | --- |
| "Don't assume that documenting requirements is the main problem. The real problem is understanding and validating what the client actually wants."
— Nitya, BA 3.5 years |
| --- |
| "Don't over-focus on documentation. The real problem is misalignment, assumptions, and lack of validation. If your solution doesn't address those, it won't matter how good the documentation is."
— Inaleo, Senior BA 8 years |
| --- |
| "Don't focus only on solving for the BA. The real problem exists across stakeholders, decision-makers, and teams. If your solution doesn't address alignment and validation across the system, it won't scale."
— Payal, BA Director 15 years |
| --- |
| "High-fidelity prototypes significantly improved requirement clarity and reduced change requests later. It gives me more confidence when closing requirements."
— Nitya, BA 3.5 years |
| --- |
| "When I first see a prototype, my initial reaction is usually mixed. Parts of it look right but something feels off. It's often hard to immediately articulate what's wrong — it's more of a feeling."
— Kamal, Operations Head |
| --- |
| "I maintain a personal risk tracker specifically for requirement-related risks. If something feels unclear, I assume it will become a problem later."
— Sameer, Senior PM |
| --- |
| "Requirements should be treated as evolving hypotheses, not fixed documents. A process that continuously validates and adapts requirements in real-time would solve a lot of problems."
— Inaleo, Senior BA 8 years |
| --- |
| "A vendor would earn deeper trust if they ask more 'why' questions, spend time understanding real workflows — not just documented ones — and challenge us when something doesn't make sense. That shows they're thinking beyond just implementation."
— Kamal, Operations Head |
| --- |
| "Requirement issues don't stay in requirements — they cascade into planning, execution, and team morale. The impact is much bigger than it initially looks."
— Sameer, Senior PM |
| --- |