
ClarityOS
UI Architecture & Feature Specification
Version 1.0  ·  Internal Product Document
Confidential — For product and development team use only


# 1. Left Panel — Navigation Tree


## 1.1  What Was Removed
Two UI elements have been removed from the previous design:
- The Modules / Pages tab strip that sat above the tree. There is no tab selector. The tree is always visible and always shows the module hierarchy. No toggle needed.
- The Modules label above the tree. Removed. The tree speaks for itself.
- Functionality-level nodes from the tree. Functionalities are too granular for the navigation sidebar. They live inside the Feature Detail panel in the centre section, not in the tree.


## 1.2  Hierarchy — The Five Levels



## 1.3  Creation Rules
BAs can create any node dynamically — like adding files and folders in Confluence. Three entry points exist:
- + button at the top of the panel — opens a creation picker. System infers the most logical parent from the currently selected node.
- Hover on any tree node — a + icon appears on the right of the row. Context-aware: hovering a Module suggests adding a Page or Submodule beneath it.
- Right-click any node — context menu: Add / Rename / Delete.


### Validation gates


## 1.4  What Each Level Displays in the Tree Row

### Module row
- Name of the module.
- Flag badge — count of features inside with a confidence score below 50%, shown in red. If all features are healthy, a green tick is shown instead.
- Click behaviour: opens the Details tab in the centre panel, showing module overview and full feature list sorted by lowest confidence.


### Submodule row
- Name of the submodule.
- No badge. Submodule is a pure folder — it carries no confidence signal of its own.
- Click behaviour: expand or collapse only. Not a navigation trigger. Nothing opens in the centre panel.


### Page row
- Name of the page.
- No badge. Pages do not carry a confidence signal directly.
- Click behaviour: opens the Prototype tab in the centre panel, showing the interactive prototype for this page.
- Hover: a prototype icon appears on the right of the row as a shortcut.


### Feature row
- Name of the feature.
- Confidence score badge — the Feature Confidence Score (FCS) displayed as a number with colour signal: green (80–100), amber (50–79), red (0–49).
- Three confidence dots representing Documentation, Elicitation Depth, and Assumption Risk at a glance. Green / amber / red per axis.
- Click behaviour: opens the Details tab in the centre panel, showing full feature BRD content, confidence breakdown, and open questions.
- Hover: a detail icon and a BRD scroll icon appear on the row as shortcuts.


## 1.5  Hover Icons — Per Level


# 2. Centre Panel — Tab System


## 2.1  Tab Order and Triggers



## 2.2  Details Tab — Two Contexts
The Details tab is one tab that serves two different tree clicks. The content inside changes based on what was clicked. The tab label and position never change.


### When a Module is clicked — Module Overview


### When a Feature is clicked — Feature Detail
Shows full BRD-structured content for this specific feature. Every field is inline-editable. The BA can update any section directly without switching views.

Top of panel shows:
- Feature name and parent path (Module › Page)
- Feature Confidence Score — prominent, live-updating as edits are made
- Open questions sorted by lowest confidence impact — each with an Answer button

Below that, all BRD sections in order:



## 2.3  The Answer Button and Quiz Modal
The Answer button appears in two places: on feature rows in the Module overview, and on open question rows in the Feature Detail panel. Clicking it opens an MCQ quiz modal.


### Quiz modal — behaviour
- Full-screen modal. Entire viewport becomes the quiz. No distractions.
- Feature name and current confidence score visible at top right throughout — the BA watches the score climb as they answer.
- Options A, B, C, D — AI-generated plausible answers based on the feature context.
- Option E (Enter your own answer) — expands an inline text field within the same card. The four options remain visible. Whichever the BA acts on last is the submitted answer.
- Skip — saves the question as an open question on the feature and moves to the next question immediately.
- Each answer generates the next question dynamically — not from a fixed bank. The next question follows the logic of what the previous answer revealed or left unclear.
- Loop ends when FCS reaches 100%, or the BA closes the modal.
- Every answer immediately updates BRD, Excel, Mindmap, and Prototype.


# 3. Right Panel — AI Intake Agent


## 3.1  What the BA Types
No format is required. The BA types anything in natural language:
- "The vendor should be able to upload their menu with photos and prices"
- "Login should work with Google also"
- "When booking is cancelled, money should go back but deduct 10% if cancelled within 24 hours"
- "Admin needs a dashboard to see all transactions"

The AI reads the input and identifies: (a) what level this belongs to — module, page, feature, or functionality — and (b) what is missing or ambiguous before it can document it properly.


## 3.2  The Four Stages of Every Interaction

### Stage 1 — Free input
BA types anything. No structure required. The agent receives it and begins analysis immediately.


### Stage 2 — Clarification loop
If the AI needs clarification — which it almost always will — it enters an MCQ quiz loop before documenting anything. The AI never documents without clarity. It always asks first.

Quiz format in the right panel:
- Question card appears above the input field. Input is disabled while a question is active.
- Options A, B, C, D — plausible answers derived from the context of what was typed.
- Option E — inline text field that expands within the same card.
- Skip this question — always available. Skipped questions become open questions on the feature.
- Each answer generates the next question dynamically based on what was revealed.
- The AI never asks a question whose answer is already implied by a previous answer in this session.


### Stage 3 — Pre-confirmation summary
Before writing anything, the AI shows a structured summary of what it is about to create. The BA must confirm. Nothing is written without explicit confirmation.

The summary shows:
- Target module (existing or new)
- Target page (existing or new)
- Feature name and list of functionalities to be created
- Exactly which artefacts will be updated: BRD section, Excel rows, Mindmap node, Prototype component

The BA has three choices:
- Confirm & Create — everything is written simultaneously. All artefacts update in one operation.
- Edit — returns to the summary in editable state. BA can change target module, page name, feature name, or any detail before confirming.
- Cancel — nothing is created. Chat history stays visible for rephrasing.


### Stage 4 — Creation and confirmation
After confirmation, the AI executes all updates simultaneously:
- Creates or updates the tree node in the left panel
- Writes the feature detail into the Details tab
- Updates BRD at product level
- Updates Excel at product level
- Updates Mindmap at product level
- Generates or updates the Prototype component for the relevant page
- Recalculates FCS for the affected feature and parent module

The panel then shows a success state with: feature name, updated confidence score, count of remaining open questions, and three action links — Answer open questions, View in tree, Keep chatting.


## 3.3  AI Routing Logic — Where Content Is Placed


## 3.4  Panel States



# 4. Project Confidence Score


## 4.1  The Score Badge — Top Bar
Displayed in the top navigation bar, to the left of the profile avatar. Always visible regardless of which panel or tab is active.


On hover: a micro-tooltip shows "Average across N features" so the BA always knows what the number represents.
On click: opens the Project Confidence page — a full-page view replacing the main canvas.



## 4.2  The Feature Confidence Score Formula
Each feature carries an independent confidence score calculated across five axes. This is the ground truth from which all other scores are derived.



### D — Documentation Score (weight: 25%)
Measures how completely the requirement is captured across all BRD sections. Not binary — each section is scored by how substantively it is filled. Vague language penalty: any section containing "TBD", "as needed", "to be decided" loses 50% of that section's contribution automatically.



### E — Elicitation Depth Score (weight: 25%)
Measures how deeply the underlying intent has been excavated. This is the axis that separates ClarityOS from every other requirements tool.




### A — Assumption Risk Score (weight: 20%)
Works inversely — more unvalidated assumptions means a lower score. Once an assumption is validated, its risk weight is removed and the score improves immediately.




### S — Stability Score (weight: 15%)
Measures how likely this requirement is to change — and whether informal changes have already occurred without being formally captured.




### V — Prototype Validation Score (weight: 15%)
Measures whether the client has reacted to a concrete representation of this requirement. Cannot be gamed by writing — requires actual client interaction.




## 4.3  Project Confidence Score Formula

The project score is a straight average — the executive headline number. Module scores use downward weighting so that a single critical gap pulls the module score down more than a straight average would suggest. One broken feature in a module cannot be hidden by nine healthy ones.


## 4.4  The Project Confidence Page
A full-page view. Replaces the main canvas when opened. Has its own back navigation.


### Section 1 — Project header
Project name, last updated timestamp, total feature count, and the project confidence score displayed prominently with colour signal.


### Section 2 — Analysis cards


### Section 3 — Module breakdown
A horizontal confidence bar per module, sorted by lowest score first. Each bar is clickable — takes the BA back to the main view with that module selected and the Details tab open.


### Section 4 — Full feature list
All features across all modules sorted by ascending confidence score — lowest first. This is the BA's complete action queue.

Each feature row shows:
- Feature name
- Parent path: Module › Page
- FCS with three-axis breakdown shown as three small bars
- Count of open questions remaining
- Answer button — the primary action


## 4.5  The Full-Screen Quiz Modal — From the Confidence Page
Triggered by clicking Answer on any feature row. Full-screen — not a card or drawer. The entire viewport becomes the quiz.



### Completion states
- Score reaches 100% mid-session: Quiz stops. Completion screen shown. BRD, Excel, Mindmap, Prototype updated. BA offered: View feature or Back to confidence page.
- BA skips enough to exhaust questions before 100%: Modal shows current score and count of skipped questions. Offered: Answer skipped questions or Done for now.


# Appendix — Quick Reference

## A.  Click Behaviour Summary


## B.  Artefact Update Triggers


## C.  Confidence Score Axis Summary


# 5. Working Prototype — Definition and Requirements


## 5.1  What "Working Prototype" Means
The distinction from a design tool is absolute. A Figma screen is a picture of software. A ClarityOS prototype is software — constrained only by the absence of a real backend. Every visible element must behave the way it would in production:



## 5.2  Technical Architecture of the Prototype
The prototype is built as a React application. This is non-negotiable for ClarityOS given its layout complexity — a persistent tree panel, shared confidence state across all panels, a tabbed centre section, and a live-updating top bar score cannot be cleanly maintained in a single HTML file.


### Technology stack


### Data seeding approach
All data the prototype needs is seeded in structured JavaScript objects loaded at app start. This includes:
- Module and feature tree data with confidence scores and open questions
- BRD content for each seeded feature
- User list for stakeholder assignment
- Prototype interaction data — form validation rules, dropdown values, table rows
- Quiz question banks per feature — with MCQ options seeded for each open question

Data added by the user during a prototype session (new modules, answered quiz questions, edited feature details) is held in React state for that session. It does not persist across page refreshes — this is expected and acceptable for a prototype. No localStorage, no IndexedDB needed.


## 5.3  Page-to-Page Navigation
Every prototype page is connected to every other page it would link to in production. Navigation is never dead-ended. The following connections are required at minimum:


## 5.4  Interactive Behaviour — Detailed Requirements

### Left panel tree
- Expand and collapse works on all levels with chevron animation
- Clicking a module loads the Details tab — tree selection highlights the active node
- Clicking a page loads the Prototype tab
- Clicking a feature loads the Details tab for that feature
- Hover on page or feature rows reveals the quick-action icon strip
- Adding a new node inline — the node appears in the tree immediately, a text cursor activates for naming, Enter confirms, Escape cancels
- Deleting a node shows a confirmation modal before removing


### Details tab — module view
- Feature list renders with live confidence score bars
- Sorting is by ascending confidence score — lowest first, always
- Answer button on each feature row opens the quiz modal
- Clicking a feature name in the list navigates to the Feature Detail view (Details tab refreshes in place)


### Details tab — feature view
- All BRD sections render with their seeded content
- Every field is inline editable — click to edit, click away or press Enter to confirm
- Editing any field recalculates and updates the FCS badge at the top of the panel in real time
- Editing any field also updates the BRD tab, Excel tab, and Mindmap tab immediately
- Open questions list sorts by confidence impact — highest impact gap first
- Answer button opens the quiz modal for that specific question


### Quiz modal
- Opens full-screen — entire viewport
- Feature name and live confidence score visible at top right throughout
- Selecting an option (A, B, C, or D) highlights it — Submit button activates
- Selecting option E expands an inline text area — Submit activates when text is non-empty
- Skip moves to the next question and logs the skipped question as an open question
- Submitting an answer generates the next question dynamically and rerenders the modal
- Confidence score at top right increments after each answer
- Progress bar at the bottom updates after each answer
- When score reaches 100%, completion state replaces the question UI


### Right panel — AI intake
- Text input accepts free typing
- Submitting text triggers the clarification quiz card to appear above the input
- Input field is disabled while a quiz card is active
- Answering or skipping a clarification question generates the next one or moves to the summary state
- Summary card shows exactly what will be created with Confirm / Edit / Cancel options
- Confirming adds the node to the left tree, updates all product artefact tabs, and shows the success state


### Project Confidence page
- Score badge in top bar is always live — updates immediately after any quiz answer or field edit
- Four analysis cards show correct counts derived from seeded data
- Module breakdown bars are sorted by ascending score — lowest first
- Feature list is sorted by ascending FCS — lowest first, always
- Answer button opens full-screen quiz modal for that feature
- Module bar click navigates back to main view with that module selected in the left tree


## 5.5  What the Prototype Does Not Need
To keep the prototype focused and maintainable, the following are explicitly out of scope:
- No real authentication — login with any seeded credential (e.g. demo@clarityos.com / Demo@1234) passes
- No email sending — email verification flow is simulated with a mock confirmation screen
- No file uploads — file input fields render but do not process files
- No real-time collaboration — multi-user state sync is not required
- No data persistence across sessions — refreshing the page resets to seeded state
- No mobile responsiveness required for v1 prototype — desktop viewport only


# 6. BRD Structure — Feature Detail Format


## 6.1  The 15-Section Structure
The following sections are required for every feature. Sections not yet filled are shown as empty with an AI prompt to complete them — they are never hidden. An empty section is a visible signal of low documentation score.


### Section 1 — Description
A plain-language statement of what this feature does and why it exists. One to three sentences. Written for a non-technical reader. Should answer: what does this feature enable, and who uses it?
Example: "Allows a new Venue Owner to register using basic details and email verification before accessing the platform."


### Section 2 — Assumptions
A list of conditions that must be true for this feature to work as specified. Each assumption is auto-tagged by the AI with a risk category (external system dependency, user behaviour, data availability, process, technical, or scope). Unvalidated assumptions reduce the Assumption Risk axis of the FCS.


### Section 3 — Functionalities
Numbered list of the specific, discrete behaviours this feature must perform. Each functionality is the atomic unit of the feature — it should be independently testable. This section feeds directly into the Excel tab rows and the confidence scoring system.
Format: 3.1, 3.2, 3.3 — each with a short title and one-sentence description. Sub-items allowed for complex flows.


### Section 4 — Validations
All input validation rules, field-level constraints, and business logic checks. Organised by field or by rule type. Specificity is mandatory — "valid format" is not acceptable. The exact rule must be stated.


### Section 5 — Functional Flow
Step-by-step sequence of how the feature executes from trigger to completion. Written as an ordered list. Must include decision points, branching paths (e.g. valid vs invalid input), and the end state of each path.
Example: 1. User fills form → 2. System validates inputs → 3a. Valid: create user in inactive state → 4. Generate verification token → 5. Send verification email → 3b. Invalid: show inline error on failed field.


### Section 6 — Error Messages
A complete mapping of every error scenario to its exact user-facing message. No placeholders. No "appropriate error message". The exact string the user will see.


### Section 7 — UI/UX Specifications
Screen-level behaviour, layout notes, interaction states, and micro-copy. Covers what the user sees at each stage of the feature flow — not just the happy path.
- Layout: Clean single-page form. Inline validation (real-time errors on blur).
- Mandatory fields marked with *. Optional fields have no marker.
- Post-submit state: Confirmation screen titled "Check Your Mail!" with two action buttons: Change Email and Resend Link.
- Helper link: "Already Registered? Log in Now" below the submit button.


### Section 8 — Acceptance Criteria
Testable conditions that define when this feature is complete and correct. Written as a checklist. Each item must be independently verifiable by QA without ambiguity.
- User can successfully register with valid inputs across all required fields.
- Duplicate email address is blocked with the correct error message.
- Verification email is triggered on successful form submission.
- User cannot log in before email verification is completed.
- Verification link activates the account on click.
- Password that does not meet the rules is rejected with the correct message.


### Section 9 — Business Rules
Policies and constraints that govern this feature's behaviour. These are decisions made by the business — not technical constraints. Each rule should have an owner or source if known.
- Email verification is mandatory before account activation — no exceptions.
- One email address per account — no duplicate registrations.
- Verification link is valid for 24 hours from the time of sending.
- Maximum 3 resend attempts within any 15-minute window.


### Section 10 — Pre-Conditions
The state the system and user must be in before this feature can execute. If any pre-condition is not met, the feature should not be reachable or should surface a clear error.
Example: "User is not already registered in the system."


### Section 11 — Post-Conditions
The state the system is in after this feature has executed successfully. Describes what has changed — in data, in user state, in system state.
Example: "User account is created and activated. User can now log in with their verified credentials."


### Section 12 — Edge Cases
Known exception scenarios that fall outside the main functional flow. Each edge case should describe the scenario and the expected system behaviour. Edge cases left without a specified behaviour become open questions automatically.
- Multiple clicks on the same verification link — system must handle gracefully (idempotent activation).
- User attempts to resend verification link more than 3 times within 15 minutes — blocked with cooldown message.
- User abandons the registration flow mid-way — account remains in inactive state, no orphaned active sessions.


### Section 13 — Impact Assessment
The services, systems, and teams that this feature touches. Used by the PM to assess scope and plan dependencies. Organised by layer.


### Section 14 — Open Questions
Unresolved decisions that must be answered before this feature can be fully specified or built. Sorted by confidence impact — highest impact gap first. Each open question has an Answer button that triggers the quiz modal.


### Section 15 — Backend Considerations
Developer-facing notes on the API tasks, data model changes, and service integrations this feature requires. Written for the development team, not the client. These are tasks, not requirements — they describe how to build, not what to build.
- Create User API — accepts registration payload, creates user record in inactive state.
- Email uniqueness check — query before creation, return conflict error if duplicate found.
- Token generation — create time-bound verification token, store with user record.
- Email service integration — trigger transactional email with verification link on user creation.
- Password hashing — bcrypt or equivalent, never store plaintext.


## 6.2  Section Completion and Confidence Scoring
Not all 15 sections carry equal weight in the Feature Confidence Score. The Documentation axis (D) of the FCS weights sections by their impact on delivery failure:


Sections 1 (Description), 2 (Assumptions), 10 (Pre-Conditions), 11 (Post-Conditions), 13 (Impact Assessment), 14 (Open Questions), and 15 (Backend Considerations) contribute to the overall completeness signal but do not carry individual D-axis weights. Their presence and quality improve the Elicitation Depth and Assumption Risk axes instead.


## 6.3  Vague Language Penalty


## 6.4  Role Access Mapping
Each feature includes a Role Access Mapping table showing which user roles can access or perform the feature. This is part of the feature specification — not a separate permissions document.


Role access is defined per feature, not per module. As features are added, the role mapping table for each feature is populated either manually by the BA or through the AI intake agent when roles are mentioned in the requirement description.

ClarityOS — UI Architecture & Feature Specification  ·  Confidential

| What this document covers Left panel tree architecture  ·  Centre panel tab system  ·  Right panel AI intake agent  ·  Project Confidence Score |
| --- |


| The left panel is the project's structural backbone. It shows the full hierarchy of what is being built, the health of each node, and provides the primary navigation trigger for every centre panel view. |
| --- |


| Module   └ Submodule         (optional — BA can skip)       └ Page           └ Feature      (must have a parent Page) |
| --- |


| Level | Role in the hierarchy |
| --- | --- |
| Module  M | The broadest organisational unit. Maps to a major domain of the product. Can exist alone without submodules. |
| Submodule  S | Optional folder layer for grouping pages within a module. A BA can skip this entirely and place pages directly under a module. |
| Page  P | A specific screen or view in the product. Must have a parent module or submodule. Cannot exist without one. |
| Feature  F | A named capability within a page. Must have a parent page. Cannot exist without one. The primary unit of confidence tracking. |


| Action | System behaviour |
| --- | --- |
| Feature with no parent Page | Blocked. Prompt: "Features must belong to a page. Create or select a page first." |
| Page with no parent Module | Blocked. Same prompt pattern. |
| Deleting a Module with children | Warning: "This will delete X pages and Y features. This cannot be undone." |
| Empty name on creation | Node not confirmed until name has at least one character. |


| Level | Hover icons shown |
| --- | --- |
| Module | None. Left click is the only action. |
| Submodule | None. Left click only expands or collapses. |
| Page | Prototype icon only — opens prototype in centre panel. |
| Feature | Detail icon (opens Feature Detail) + BRD scroll icon (scrolls BRD to this feature's section). |


| The centre panel is the primary workspace. It has five tabs. The active tab is driven by what the BA clicks in the left tree — but tabs can also be switched manually at any time. |
| --- |


| Tab | Opens when |
| --- | --- |
| Details  (position 1) | BA clicks a Module or a Feature in the left tree. |
| Prototype  (position 2) | BA clicks a Page in the left tree. |
| BRD  (position 3) | Manual tab selection only. Always shows full product-level BRD. |
| Excel  (position 4) | Manual tab selection only. Always shows full product-level requirement spreadsheet. |
| Mindmap  (position 5) | Manual tab selection only. Always shows full product-level mindmap. |


| BRD, Excel, and Mindmap are always product-level documents. They are never filtered or scoped to a selected module, page, or feature. When a feature is selected in the tree, the BRD scrolls to that feature's section — but the document always shows everything. |
| --- |


| Section | What it shows |
| --- | --- |
| Module header | Name, description, assigned user, created date, last updated timestamp. |
| Confidence summary | Aggregate FCS across all features in this module. Weighted toward lowest-scoring features. |
| Feature list | All features in this module sorted by ascending confidence score — lowest first. Each row shows: feature name, parent page, FCS score, most critical open question, and an Answer button. |
| Module assumptions | Assumptions that span multiple features within this module — not belonging to any single feature. |
| Impact summary | Backend services, frontend surfaces, and QA areas touched by this module — auto-derived from features inside it. |


| Section | Behaviour |
| --- | --- |
| Description | Free text. Inline editable. |
| Assumptions | List of assumptions. Each auto-tagged by AI with a risk category. |
| Functionalities | Numbered list of specific behaviours this feature must perform. |
| Validations | Field-level and logic-level validation rules. |
| Functional Flow | Step-by-step sequence of how the feature executes. |
| Error Messages | Scenario-to-message mapping table. |
| UI/UX Specifications | Screen-level behaviour, states, and layout notes. |
| Acceptance Criteria | Testable conditions that define done. |
| Business Rules | Constraints and policies governing this feature. |
| Pre / Post Conditions | State before and after the feature executes. |
| Edge Cases | Known exception scenarios. |
| Impact Assessment | Backend, frontend, security, and QA impact. |
| Open Questions | Unresolved questions sorted by confidence impact. Descending. |
| Backend Considerations | API tasks, data models, and service dependencies. |


| Any edit — manual typing or quiz answer — triggers a live update to the BRD, Excel, Mindmap, and Prototype. The BA never clicks Save. Everything is always current. |
| --- |


| The right panel is not a chat window. It is the conversational elicitation engine — the AI intake agent that accepts raw, unstructured requirement input from the BA and converts it into structured, documented requirements across all product artefacts. |
| --- |


| Situation | What the AI does |
| --- | --- |
| BA is focused on a tree node | Defaults to creating content under that context. If they are on the Booking System module, input is assumed to belong there unless content clearly signals otherwise. |
| Input mentions an existing node by name | Routes to that existing node and adds to it. Does not create a duplicate. |
| Input is entirely new with no clear parent | Asks in the clarification loop: "Where does this belong?" — options are existing modules + "Create new module". |
| Input spans multiple features | Splits into separate items in the pre-confirmation summary. BA can merge or separate before confirming. |


| State | What the panel shows |
| --- | --- |
| Empty | Prompt: "Describe any requirement in plain language. I'll ask a few quick questions, then document everything — BRD, Excel, Mindmap and Prototype." |
| Typing | Standard text input. No special format required from the BA. |
| Clarification | MCQ card appears above the input. Input is disabled while a question is active. |
| Summary | Pre-confirmation card fills the panel. Input disabled. |
| Success | Confirmation card with links to what was created. Input re-enables immediately. |
| History | All previous inputs and AI responses remain visible above, scrollable. |


| Critical principle: The AI never writes first and asks later. It always clarifies, summarises what it will do, gets confirmation, then acts. A BA who sees the system write something wrong into their BRD without asking will lose trust immediately. The confirmation step is the trust mechanism. |
| --- |


| The Project Confidence Score is a live, system-generated health signal for the entire project. It lives in the top bar, always visible, and gives any stakeholder an immediate read on how much the documented requirements can be trusted. |
| --- |


| Score range | Colour and label |
| --- | --- |
| 80–100 | Green — High confidence |
| 50–79 | Amber — Needs attention |
| 0–49 | Red — Critical gaps |


| Every time a BA answers a question — from the Project Confidence page, the Details tab, or the right panel — the score badge updates in real time. The project number ticks upward after every answer, making the abstract goal of better requirements feel tangible. |
| --- |


| FCS = (D × 0.25) + (E × 0.25) + (A × 0.20) + (S × 0.15) + (V × 0.15)  D — Documentation Score E — Elicitation Depth Score A — Assumption Risk Score S — Stability Score V — Prototype Validation Score |
| --- |


| BRD Section | What earns a high score | Weight |
| --- | --- | --- |
| Functionalities | Specific, numbered, testable behaviours | 20% |
| Validations | Field-level rules with exact formats | 15% |
| Acceptance Criteria | Testable conditions — not general statements | 15% |
| Error Messages | Scenario-to-message mapping, not placeholders | 10% |
| Edge Cases | Named and described — not just listed | 10% |
| Functional Flow | Sequenced steps with decision points | 10% |
| UI/UX Specifications | Specific screen states and interactions | 10% |
| Business Rules | Constraints with specific values and logic | 10% |


| E = (Why_chain_depth × 0.40) + (Stakeholder_coverage × 0.35) + (Mess_safe_probing × 0.25) |
| --- |


| Component | Scoring logic |
| --- | --- |
| Why-chain depth | 0 probes answered = 0. 1 surface answer = 25. 2–3 answers with business context = 60. Full excavation including operational reality = 100. |
| Stakeholder coverage | 1 stakeholder = 40. 2 stakeholders aligned = 75. 2+ with contradictions surfaced and resolved = 100. 2+ with unresolved contradictions = 30. |
| Mess-safe probing | Not asked = 0. Asked but skipped = 20. Asked, answered, no changes resulted = 60. Asked, answered, requirement changed as a result = 100. |


| A = 100 − (sum of risk weights for all unvalidated assumptions) Floor: 0 — cannot go negative. |
| --- |


| Assumption category | Risk weight |
| --- | --- |
| External system dependency | −20 (e.g. "Payment gateway will support partial refunds") |
| User behaviour assumption | −15 (e.g. "Users will complete the flow in one session") |
| Data availability assumption | −15 (e.g. "All historical records will be migrated") |
| Process assumption | −12 (e.g. "Approver is always available within 24 hours") |
| Technical assumption | −10 (e.g. "API response time under 500ms") |
| Scope assumption | −10 (e.g. "Admin will manually handle exceptions") |


| S = 100 − informal_change_penalties − recency_decay  Recency decay = min(30, days_since_last_validation × 1.5) Floor: 0 — cannot go negative. |
| --- |


| Signal | Penalty |
| --- | --- |
| Informal change captured in chat — not yet formalised | −25 per change |
| Stakeholder contradiction not yet resolved | −20 |
| Requirement edited more than 3 times in last 7 days | −15 |
| Open question marked as critical — unanswered | −15 |
| Feature flagged as subject to leadership approval | −10 |
| Not validated in 14+ days (recency decay) | Up to −30 |


| V = (Prototype_generated × 0.20) + (Client_viewed × 0.25)   + (Reaction_captured × 0.30) + (Reaction_incorporated × 0.25) |
| --- |


| Stage | Points |
| --- | --- |
| Prototype generated for this feature | 20 |
| Client has viewed the prototype (session recorded) | 25 |
| Client answered structured reaction prompts | 30 |
| Requirement updated based on client feedback | 25 |


| Project Score = average of all Feature Confidence Scores across all modules  Module Score = average of all FCS in that module,                with bottom 20% of features weighted 2× |
| --- |


| Card | What it shows |
| --- | --- |
| Features at 100% | Count of fully confident features. The BA knows what is locked. |
| Features below 50% | Count of critical gaps. The BA knows what is urgent. |
| Open questions remaining | Total unanswered questions across all features. The most actionable number on the page. |
| Most improved this week | The feature whose FCS has risen most in the last 7 days. Shows momentum. |


| Element | Behaviour |
| --- | --- |
| Feature name + FCS | Visible at top right throughout. BA watches score climb as they answer. |
| Question count | Shown as "Question 2 of ~4" — approximate, not fixed. Updates dynamically as the chain evolves. |
| Options A–D | AI-generated plausible answers based on feature context so far. |
| Option E — text input | Expands inline within the same card. Options A–D remain visible. Last action submitted is the answer. |
| Skip | Saves question as open question on the feature. Moves to next question immediately. |
| Progress bar | Shows answered / estimated total at the bottom of the modal. |


| Tree click | Centre panel response |
| --- | --- |
| Module | Details tab — module overview with feature list by confidence |
| Submodule | Expand / collapse only — no centre panel change |
| Page | Prototype tab — interactive prototype of this page |
| Feature | Details tab — full BRD content for this feature |


| Action | Artefacts updated |
| --- | --- |
| BA manually edits a field in Feature Detail | BRD, Excel, Mindmap, Prototype, FCS |
| BA answers a quiz question | BRD, Excel, Mindmap, Prototype, FCS, Project Score |
| BA confirms an AI intake summary | BRD, Excel, Mindmap, Prototype, tree node, FCS, Project Score |
| Assumption is validated | FCS (Assumption Risk axis), Project Score |
| 14 days pass without validation | FCS (Stability axis — recency decay), Project Score |


| Axis | Weight — What it catches |
| --- | --- |
| D — Documentation | 25% — Missing fields, vague language, incomplete specs |
| E — Elicitation Depth | 25% — Shallow intent, single stakeholder, no mess-safe probing |
| A — Assumption Risk | 20% — Unvalidated dependencies and preconditions |
| S — Stability | 15% — Informal changes, staleness, unresolved conflicts |
| V — Prototype Validation | 15% — Client has never reacted to what was written |


| The prototype in ClarityOS is not a design screen or a Figma mockup. It is a fully interactive frontend simulation — a working application where every element behaves like real software. No backend, no API, no database. All state lives in memory during the session. |
| --- |


| Element | Working behaviour required |
| --- | --- |
| Navigation links and buttons | Clicking routes to the correct page. Login form submission redirects to the dashboard. Back buttons and browser history work correctly. |
| Forms and inputs | Typing works. Real-time validation fires on blur and on submit. Required field errors surface. Password show/hide toggle works. Dropdowns open with real seeded values. |
| Tables and lists | Real data rendered — not placeholder rows. Column sorting works. Search filters the visible rows live as the user types. Pagination controls work. |
| Filters and dropdowns | Selecting a filter value updates the table or list immediately. Multi-select filters work. Clear filter resets to full dataset. |
| Modals and drawers | Open and close correctly. Forms inside modals submit and update the underlying list. Confirmation dialogs block the action until confirmed or cancelled. |
| State persistence across panels | Data added in one panel appears in another. Adding a feature in the left tree adds it to the BRD. Answering a quiz question updates the confidence score badge in the top bar. |
| Icons | All icons sourced from Lucide (lucide.dev) — open source, MIT licensed. No emoji anywhere in the prototype. |


| Layer | Technology |
| --- | --- |
| Framework | React (with React Router for page navigation) |
| State management | React Context + useState — no Redux, no external state library |
| Styling | Tailwind CSS utility classes |
| Icons | lucide-react — imported per icon, no icon font files |
| Data | Seeded in-memory JavaScript objects — a data.js file per module area |
| Build | Vite — fast dev server, clean build output |
| No backend | Zero API calls. Zero database. Zero authentication service. All logic runs in the browser. |


| From | To — on what action |
| --- | --- |
| Login page | Dashboard / home — on valid credential submit |
| Registration page | Email confirmation screen — on valid form submit |
| Email confirmation screen | Login page — on 'Back to login' click |
| Dashboard | Any module detail — on module card click |
| Left tree — Module click | Details tab with module overview |
| Left tree — Page click | Prototype tab with that page's prototype |
| Left tree — Feature click | Details tab with feature BRD content |
| Feature detail — Answer button | Full-screen quiz modal |
| Quiz modal — completion | Feature detail or Project Confidence page |
| Top bar — Confidence score badge | Project Confidence page |
| Project Confidence page — module bar | Main view with that module selected |
| Project Confidence page — Answer button | Full-screen quiz modal for that feature |


| Every feature in ClarityOS — whether created manually, via the AI intake agent, or through the quiz system — is documented using a standardised 15-section structure. This structure is the same whether the BA is viewing a feature in the Details tab, reading the BRD tab, or receiving an export. It is the single format for all requirement documentation. |
| --- |


| Assumption text | Auto-tagged category |
| --- | --- |
| User has a valid email ID and phone number | User behaviour assumption |
| Email service is configured and operational | External system dependency |
| No social login / SSO in current scope | Scope assumption |


| Field / Rule | Validation specification |
| --- | --- |
| First Name / Last Name | Alphabets and spaces only. No leading, trailing, or consecutive spaces. |
| Email | Valid format. Must be unique in the system. No spaces or consecutive dots. |
| Phone Number | Exactly 10 digits. Numeric only. |
| Password | Minimum 8 characters. At least 1 number and 1 special character. |


| Scenario | Exact error message |
| --- | --- |
| Duplicate email | "This email is already registered. Please log in." |
| Invalid email format | "Enter a valid email address." |
| Phone number not 10 digits | "Phone number must be 10 digits." |
| Verification link expired | "Verification link has expired. Please request a new one." |
| Password too weak | "Password must be at least 8 characters and include a number and special character." |


| Layer | Impact |
| --- | --- |
| Backend | User service, email service, token generation and expiry management. |
| Frontend | Registration form component, inline validation logic, confirmation screen. |
| Security | Token expiry enforcement, password hashing, uniqueness checks. |
| QA | Validation rule testing, email flow simulation, edge case coverage. |


| Question | Confidence impact |
| --- | --- |
| Should phone number also be verified via OTP? | High — affects functional flow and backend scope |
| Should social login (Google, LinkedIn) be supported in a future phase? | Medium — affects assumption tagging |
| What is the resend cooldown UX — countdown timer, disabled button, or message only? | Medium — affects UI/UX specifications |


| Section | D-axis weight |
| --- | --- |
| 3 — Functionalities | 20% |
| 4 — Validations | 15% |
| 8 — Acceptance Criteria | 15% |
| 6 — Error Messages | 10% |
| 12 — Edge Cases | 10% |
| 5 — Functional Flow | 10% |
| 7 — UI/UX Specifications | 10% |
| 9 — Business Rules | 10% |


| Any section containing the following terms loses 50% of that section's Documentation score contribution automatically: "TBD", "to be decided", "as needed", "should work", "as required", "TBC", "N/A" used as a placeholder, or any empty section submitted as complete. This penalty is auto-applied by the AI and visible in the section's inline score indicator. |
| --- |


| Feature | Venue Owner | Admin / Auditor |
| --- | --- | --- |
| Venue Owner Registration | Yes — primary actor | No |
| Login with Email and Password | Yes | Yes |
