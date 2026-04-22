import { aiChat, MODELS, type ChatMessage } from './ai-client.ts'

export type ElicitationContext = {
  rawInput: string
  domain?: string
  userType?: string
  painPoints?: string[]
  workflows?: string[]
  entities?: string[]
  features?: string[]
  constraints?: string[]
  clarifications?: Record<string, string>
}

export type ElicitationQuestion = {
  text: string
  type: 'text' | 'single_select' | 'multi_select'
  options?: { id: string; label: string; description?: string }[]
  contextKey: string
}

export type BreakdownProposal = {
  modules: { name: string; subModules: { name: string; features: string[] }[] }[]
  pages: { name: string; pageType: string; linkedFeatures: string[] }[]
}

const SYSTEM_PROMPT = `You are a senior software architect with 15+ years experience building web applications. You work for Butterstack, a requirements platform.

CORE BEHAVIOR: You already know how software works. When a user says "Login Page", you don't ask why login matters or what happens after login — you KNOW. You assume best practices and only ask about project-specific decisions.

APPROACH — ASSUME AND CONFIRM:
Instead of asking one question at a time, present your FULL understanding as assumptions and ask the user to correct what's wrong.

Example for "Login Page":
"Here's what I'm planning for the Login Page:
- Email + password authentication
- 'Forgot password' link → email reset flow
- 'Register' link for new users
- After login → redirect to dashboard/home
- Input validation (email format, min password length)
- Error: 'Invalid credentials' (no reveal if email exists)
- Optional: Remember me checkbox

Which of these need changes? Or should I add anything?"

This approach:
- Shows competence (you understand the domain)
- Covers 80% in one message instead of 8 separate questions
- Only needs user input for the 20% that's project-specific
- Respects the user's time

WHEN TO USE STRUCTURED QUESTIONS (single_select / multi_select):
Only when there's a genuine decision with trade-offs the user must make:
- "What user roles does your system have?" (multi_select with common options)
- "How should the app handle session expiry?" (single_select)
- NOT for things you can assume: redirect after login, error messages, field validations

WHAT TO FOCUS ON:
- Entities and relationships (users, roles, permissions)
- Workflows that are project-specific (approval chains, custom business logic)
- Integration points (third-party auth, APIs, external systems)
- Things that differ between projects (not things that are always the same)

ALWAYS PROBE PURPOSE ("why") AT LEAST ONCE:
Early in the conversation — before finalizing the breakdown — you MUST ask at least one "why" question that anchors the feature to a real business purpose, user pain, or outcome. Good "why" questions:
- "Why does your team need this feature — what breaks today without it?"
- "What's the underlying business goal this solves — revenue, compliance, retention, speed?"
- "Who suffers most when this doesn't exist, and how?"
- "What decision does this page help the user make faster?"
The purpose/why answer is gold — it drives acceptance criteria, test cases, and prevents over-building. Capture it into contextKey "painPoints" or "clarifications.purpose".

WHAT TO NEVER ASK (trivial whys or obvious questions):
- "Why is X important?" for well-known standard features (login, password reset) — these have obvious purpose
- "What should happen after login?" (you know: go to the main page)
- "Should we validate email format?" (obviously yes)
- Any question where there's only one reasonable answer

Distinguish: asking "why does YOUR business need this login — is it customer-facing or internal ops?" is a GOOD why (specific to their context). Asking "why is login important?" is a BAD why (generic).

Respond with valid JSON:
{
  "text": "Your statement showing understanding + specific questions about what's unclear",
  "type": "text" | "single_select" | "multi_select",
  "options": [{"id": "opt1", "label": "Option label", "description": "Optional detail"}],
  "contextKey": "domain|userType|painPoints|workflows|entities|features|constraints|clarifications.subkey"
}

Only include "options" when type is single_select or multi_select.
Prefer "text" type when presenting your assumptions for confirmation — let users respond naturally.

IMPORTANT — KNOW WHEN TO STOP ASKING:
After 2-3 exchanges, you should have enough context. DO NOT keep asking questions endlessly.
When the user confirms your assumptions or says "looks good" / "go ahead" / "yes" / gives enough info — it means STOP ASKING and let the system propose the breakdown.
Your response in this case should acknowledge and summarize what you'll build. The system will automatically generate the module/feature/page breakdown.

IMPACT ANALYSIS & CHANGE DECISIONS:
When the user asks about changing something ("change X to Y", "what if we remove X", "add X to Y"), analyze the impact:
- List which modules, features, and pages are affected
- Explain what changes are needed
- Flag any risks or dependencies
- Suggest whether this is a minor tweak or a major restructuring
Format: "Impact Analysis: [affected items]. Decision: [recommendation]."
This helps stakeholders understand the ripple effect before committing.`

export async function generateNextQuestion(
  context: ElicitationContext,
  messageHistory: { role: string; content: string }[],
  previousSessionSummaries?: string[],
  userId?: number,
  images?: string[]
): Promise<ElicitationQuestion> {
  const contextSummary = buildContextSummary(context)
  const prevContext = previousSessionSummaries?.length
    ? `\n\nPrevious conversations in this project decided:\n${previousSessionSummaries.map((s, i) => `Session ${i + 1}: ${s}`).join('\n')}`
    : ''

  const imageNote = images?.length ? `\n\nThe user has shared ${images.length} image(s) — reference screenshots, mockups, or wireframes. Acknowledge what you see and use it to inform your questions.` : ''

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Current accumulated context:\n${contextSummary}${prevContext}${imageNote}\n\nConversation so far:\n${formatHistory(messageHistory)}\n\nGenerate the next question to ask. Consider what's missing and what would be most valuable to learn next.` },
  ]

  const res = await aiChat(messages, MODELS.tokens, true, 512, userId)
  try {
    return JSON.parse(res.text) as ElicitationQuestion
  } catch {
    return { text: res.text, type: 'text', contextKey: 'clarifications' }
  }
}

const CONFIRMATION_PATTERNS = /^(yes|yeah|yep|yup|ok|okay|sure|good|looks good|no changes|go ahead|perfect|correct|that'?s? ?(it|right|correct|fine|good)|lgtm|ship it|proceed|confirm|done|agreed|all good|no this looks good|thik hai|sahi hai|badhiya|haan|ha)\b/i

export function shouldPropose(context: ElicitationContext, messageCount: number, lastUserMessage = ''): boolean {
  if (CONFIRMATION_PATTERNS.test(lastUserMessage.trim())) return true

  let filled = 0
  if (context.domain) filled++
  if (context.userType) filled++
  if (context.painPoints?.length) filled++
  if (context.workflows?.length) filled++
  if (context.entities?.length) filled++
  if (context.features?.length) filled++
  if (context.constraints?.length) filled++
  if (context.clarifications && Object.keys(context.clarifications).length) filled++

  if (filled >= 3) return true
  if (messageCount >= 3) return true
  if (context.rawInput.length > 100) return true
  return false
}

const BREAKDOWN_PROMPT = `You are a software architect. Given the accumulated context from a requirements conversation, propose a structured breakdown.

Return valid JSON:
{
  "modules": [
    {
      "name": "ModuleName",
      "subModules": [
        { "name": "SubModuleName", "features": ["Feature 1", "Feature 2"] }
      ]
    }
  ],
  "pages": [
    { "name": "PageName", "pageType": "dashboard|form|list|login|detail|settings", "linkedFeatures": ["Feature 1"] }
  ]
}

CRITICAL RULES:
- NEVER create duplicates. If a module/feature/page already exists, use the EXACT SAME NAME.
- Only add NEW items that don't already exist.
- Reuse these existing module names EXACTLY: {existingModules}
- If the user is adding to an existing module, include that module with its existing sub-modules + the new additions.
- Modules are broad domains (Authentication, Dashboard, Reports, Settings)
- Sub-modules are specific areas (Login, User Profile, Invoice List)
- Features are individual capabilities under sub-modules
- Pages are UI screens — each page has a type and links to features it implements
- Keep names concise, Title Case
- Max 3 module levels deep
- When in doubt about whether something is new or existing, include it — the system will deduplicate.

WHAT COUNTS AS A FEATURE (strict):
A feature is a USER-FACING CAPABILITY — a verb + object the user can DO, or a distinct behavior the system performs. It is NEVER a UI element, a label, a field, a button, or the ABSENCE of something.

NOT features (do NOT emit these as separate features):
- UI elements: "Login Button", "Submit Button", "Email Field", "Password Input", "Captcha Checkbox"
- Field-level items: "Username and Password" (these are inputs of the parent feature, not siblings)
- Labels / copy: "Confirm You are Human", "Forgot Password link"
- Exclusions / negations: "No Social Login", "Without OTP", "No Remember Me"
- Tech choices: "JWT Auth", "Argon2 Hashing"
- Legal / policy links: "Terms and Conditions", "T&C", "Privacy Policy", "Disclaimer" — these are page-level links shown in the footer, NOT capabilities. Record them inside the parent page's UI/UX/footer notes.
- Requirement phrasings: anything starting with "Include ...", "Add ...", "Use ...", "Integrate ...", "Display ...", "Show ...", "Support ..." — these are directives applied to an existing feature, not features themselves. Absorb them into the relevant existing feature's description.

These belong INSIDE the parent feature's description — the conversation-context layer will absorb them. In your breakdown, just emit the PARENT capability.

PRESERVE THE USER'S VOCABULARY:
- If the user said "username and password", the feature is "Login" (or "Username Login") — NOT "Email Login".
- If the user said "email OTP", the feature is "Email OTP Login" — do not rename to "Magic Link".
- Do NOT invent auth methods, field names, or flows that the user did not mention.

GOOD vs BAD examples (these names are illustrative — always use the user's own terms in YOUR output):
❌ BAD: features: ["Username and Password", "Login Button", "No Social Login"]
✅ GOOD: features: ["Login"]  (the fields, the button, and the "no social" exclusion are all attributes of this one capability)

❌ BAD: features: ["Email Field", "Password Field", "Submit Button", "Forgot Password Link"]
✅ GOOD: features: ["Login", "Password Reset"]

❌ BAD: features: ["Dashboard Header", "Dashboard Stats Cards", "Dashboard User List"]
✅ GOOD: features: ["View Dashboard Stats", "View User List"]  (header is just UI chrome)

MERGE RULE: If two candidate features share the same root verb/noun (e.g., "Login" + "Login Button" + "Login Page"), collapse them into ONE feature named after the capability (keep the user's wording).

When in doubt: "Is this something a user can DO?" If no → not a feature.`

export async function generateBreakdown(
  context: ElicitationContext,
  existingModules: string[],
  userId?: number,
  conversationHistory?: { role: string; content: string }[],
  priorSessionSummaries?: string[]
): Promise<BreakdownProposal> {
  const contextSummary = buildContextSummary(context)
  const prompt = BREAKDOWN_PROMPT.replace('{existingModules}', existingModules.join(', ') || 'none yet')

  const transcript = (conversationHistory || [])
    .slice(-20)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n')

  const priorInfo = priorSessionSummaries?.length
    ? `\n\nPrior conversations in this project (decisions already made — stay consistent):\n- ${priorSessionSummaries.join('\n- ')}`
    : ''

  const messages: ChatMessage[] = [
    { role: 'system', content: prompt },
    { role: 'user', content:
      `Full conversation transcript (authoritative — honor the user's exact wording, feedback, and corrections):\n${transcript || '(none)'}${priorInfo}\n\nStructured context extracted so far:\n${contextSummary}\n\nNow produce the breakdown JSON. If the user gave adjustment feedback in recent messages (e.g. "don't include X", "use term Y instead", "merge these"), apply it. ONLY include modules/features that this current conversation is actually about — do not resurrect unrelated features from prior sessions.` },
  ]

  const res = await aiChat(messages, MODELS.tokens, true, 2048, userId)
  try {
    const raw = JSON.parse(res.text) as BreakdownProposal
    return sanitizeBreakdown(raw)
  } catch {
    return { modules: [], pages: [] }
  }
}

// Filter out non-feature noise that slipped past the prompt, and merge siblings
// that are clearly the same capability split into UI pieces.
function sanitizeBreakdown(b: BreakdownProposal): BreakdownProposal {
  const NON_FEATURE_PATTERNS = [
    /\bbutton\b/i,
    /\b(field|input|checkbox|dropdown|label|textbox)\b/i,
    /^(no|without|skip)\s+/i,                 // "No Social Login", "Without OTP"
    /\blink\b/i,                              // "Forgot Password Link"
    /^(email|password|username|phone|mobile|otp|captcha)$/i,  // bare field names
    /\b(header|footer|sidebar|navbar)\b/i,
    /\b(terms|t&c|privacy policy|conditions|disclaimer|copyright)\b/i, // legal text links — page attributes, not features
    /^(include|add|use|integrate|display|show|support)\s+/i,  // requirement-style verbs ("Include T&C", "Add logo")
  ]

  const isNonFeature = (name: string) => NON_FEATURE_PATTERNS.some(r => r.test(name.trim()))

  // Strip UI-suffix from a feature name to find its "capability stem"
  const stem = (name: string) => name
    .toLowerCase()
    .replace(/\s+(button|field|input|link|label|checkbox|dropdown|page|form)s?$/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  for (const mod of b.modules || []) {
    for (const sub of mod.subModules || []) {
      const kept: string[] = []
      const seenStems = new Set<string>()
      for (const feat of sub.features || []) {
        if (!feat || !feat.trim()) continue
        if (isNonFeature(feat)) continue
        const s = stem(feat)
        if (!s) continue
        if (seenStems.has(s)) continue
        seenStems.add(s)
        kept.push(feat)
      }
      sub.features = kept
    }
  }

  // Drop empty sub-modules and modules after filtering
  for (const mod of b.modules || []) {
    mod.subModules = (mod.subModules || []).filter(s => (s.features || []).length > 0)
  }
  b.modules = (b.modules || []).filter(m => (m.subModules || []).length > 0)

  return b
}

export function updateContext(
  context: ElicitationContext,
  contextKey: string,
  answer: string | string[]
): ElicitationContext {
  const updated = { ...context }
  const answerStr = Array.isArray(answer) ? answer.join(', ') : answer

  if (contextKey.startsWith('clarifications.')) {
    const subKey = contextKey.split('.').slice(1).join('.')
    updated.clarifications = { ...updated.clarifications, [subKey]: answerStr }
  } else if (['painPoints', 'workflows', 'entities', 'features', 'constraints'].includes(contextKey)) {
    const key = contextKey as keyof ElicitationContext
    const existing = (updated[key] as string[] | undefined) ?? []
    const items = Array.isArray(answer) ? answer : answerStr.split(/[,;]/).map(s => s.trim()).filter(Boolean)
    ;(updated as any)[key] = [...existing, ...items]
  } else {
    ;(updated as any)[contextKey] = answerStr
  }

  return updated
}

const DOC_PROMPT = `You are a senior Business Analyst generating structured documentation for a software feature/page.

Given the conversation context and the specific item name, generate comprehensive documentation in this EXACT format (all 15 sections required):

## Description
[Plain-language statement of what this feature does and why. 1-3 sentences for non-technical reader. Who uses it.]

## Assumptions
[List of conditions that must be true. Tag each with risk category: external_dependency / user_behaviour / data_availability / process / technical / scope]

## Functionalities
[Numbered list (3.1, 3.2, 3.3) of specific discrete behaviours. Each must be independently testable.]

## Validations
[All input validation rules, field-level constraints, business logic checks. Exact rules — not "valid format".]

## Functional Flow
[Step-by-step sequence from trigger to completion. Include decision points, branching paths, end states.]

## Error Messages
[Complete mapping of every error scenario to exact user-facing message. No placeholders.]

## UI/UX Specifications
[Screen-level behaviour, layout, interaction states, micro-copy. What user sees at each stage.]

## Acceptance Criteria
[Testable conditions as checklist. Each independently verifiable by QA without ambiguity.]

## Business Rules
[Policies and constraints governing behaviour. Decisions made by business, not technical constraints.]

## Pre-Conditions
[State the system and user must be in before this feature can execute.]

## Post-Conditions
[State the system is in after successful execution. What changed in data, user state, system state.]

## Edge Cases
[Known exception scenarios outside main flow. Each with scenario description and expected behaviour.]

## Impact Assessment
[Services, systems, teams touched. Organised by layer: backend, frontend, security, QA.]

## Open Questions
[Unresolved decisions. Sorted by impact. Each needs an answer before full spec or build.]

## Backend Considerations
[Developer-facing: API tasks, data model changes, service integrations. How to build, not what to build.]

## Role Access Mapping
[A MARKDOWN PIPE TABLE with exactly three columns. MANDATORY format — copy the pipes and separator row verbatim, do NOT use tabs or spaces instead of pipes:

| Role | Access Level | Notes |
|------|--------------|-------|
| Admin | Full | Can manage users and all configurations |
| User | Full | Can log in and access own dashboard |
| Guest | None | Cannot log in |

Keep the pipes on every row. Access Level values must be one of: Full, View, None.]

Be specific. Use conversation context for real details. No generic placeholders. If unknown, say so in Open Questions. Every section must have content — empty sections signal low documentation quality.

CRITICAL — INCREMENTAL UPDATES:
If an EXISTING documentation is provided as a baseline, you are UPDATING it, not rewriting from scratch. Rules:
1. PRESERVE every detail from the existing doc that the current conversation did not contradict.
2. INTEGRATE every new detail, constraint, link, field, validation, or rule mentioned in the current conversation into the relevant section(s). Even casual/brief mentions must land in the doc.
3. If the user mentioned something new (e.g. "add a Terms and Conditions link", "require OTP", "button label is X"), that detail MUST appear in:
   - UI/UX Specifications (where the element lives on screen)
   - Functional Flow (the step where it's used)
   - Acceptance Criteria (a testable check)
   - Business Rules or Validations (if it's a rule or constraint)
   - Functionalities (the capability that exposes it)
4. Never silently drop user-mentioned details. Missing them is a bug.
5. If the conversation changed a previous decision, update the old content — don't keep both.

Worked example — existing doc says "Login has email + password". User just said "Terms and Conditions ka link bhi hona chahiye":
→ UI/UX: add "A 'Terms and Conditions' link is displayed beneath the Login button and opens the T&C page."
→ Functionalities: "Users can click the 'Terms and Conditions' link to review terms before logging in."
→ Acceptance Criteria: "[ ] T&C link is visible on the Login page and navigates to the T&C document."
→ Business Rules: "User must have opportunity to view T&C at the point of login." (if applicable)
That's what integration means.`

export async function generateDocumentation(
  context: ElicitationContext,
  conversationHistory: string,
  itemName: string,
  itemType: 'feature' | 'page',
  parentModule?: string,
  linkedFeatures?: string[],
  userId?: number,
  priorSessionSummaries?: string[],
  existingDoc?: string,
): Promise<{ userInput: string; aiDoc: string }> {
  const contextSummary = buildContextSummary(context)
  const linkedInfo = linkedFeatures?.length ? `\nLinked features: ${linkedFeatures.join(', ')}` : ''
  const parentInfo = parentModule ? `\nParent module: ${parentModule}` : ''
  const priorInfo = priorSessionSummaries?.length
    ? `\n\nPrior conversations in this project (decisions already made — do NOT contradict; use as background context):\n- ${priorSessionSummaries.join('\n- ')}`
    : ''
  const existingInfo = existingDoc
    ? `\n\nEXISTING documentation for this ${itemType} (authoritative unless the CURRENT conversation explicitly changes it — preserve sections that weren't discussed this session):\n${existingDoc.slice(0, 3000)}`
    : ''

  const messages: ChatMessage[] = [
    { role: 'system', content: DOC_PROMPT },
    { role: 'user', content: `Project context:\n${contextSummary}${priorInfo}${existingInfo}\n\nCurrent conversation (the source of NEW information for this update):\n${conversationHistory}\n\nGenerate documentation for: "${itemName}" (${itemType})${parentInfo}${linkedInfo}` },
  ]

  const res = await aiChat(messages, MODELS.tokens, false, 2048, userId)

  const userInput = context.rawInput + (context.features?.length ? '\n\nDiscussed features: ' + context.features.join(', ') : '')

  return { userInput, aiDoc: res.text }
}

export function buildContextSummary(ctx: ElicitationContext): string {
  const lines: string[] = []
  if (ctx.rawInput) lines.push(`Raw Input: ${ctx.rawInput}`)
  if (ctx.domain) lines.push(`Domain: ${ctx.domain}`)
  if (ctx.userType) lines.push(`Users: ${ctx.userType}`)
  if (ctx.painPoints?.length) lines.push(`Pain Points: ${ctx.painPoints.join('; ')}`)
  if (ctx.workflows?.length) lines.push(`Workflows: ${ctx.workflows.join('; ')}`)
  if (ctx.entities?.length) lines.push(`Entities: ${ctx.entities.join(', ')}`)
  if (ctx.features?.length) lines.push(`Features: ${ctx.features.join(', ')}`)
  if (ctx.constraints?.length) lines.push(`Constraints: ${ctx.constraints.join('; ')}`)
  if (ctx.clarifications) {
    for (const [k, v] of Object.entries(ctx.clarifications)) {
      lines.push(`${k}: ${v}`)
    }
  }
  return lines.length ? lines.join('\n') : 'No context yet — this is the first message.'
}

function formatHistory(history: { role: string; content: string }[]): string {
  return history.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')
}
