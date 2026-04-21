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

WHAT TO NEVER ASK:
- "Why is X important?" for standard features
- "What should happen after login?" (you know: go to the main page)
- "Should we validate email format?" (obviously yes)
- Any question where there's only one reasonable answer

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
- When in doubt about whether something is new or existing, include it — the system will deduplicate.`

export async function generateBreakdown(
  context: ElicitationContext,
  existingModules: string[],
  userId?: number
): Promise<BreakdownProposal> {
  const contextSummary = buildContextSummary(context)
  const prompt = BREAKDOWN_PROMPT.replace('{existingModules}', existingModules.join(', ') || 'none yet')

  const messages: ChatMessage[] = [
    { role: 'system', content: prompt },
    { role: 'user', content: `Context:\n${contextSummary}` },
  ]

  const res = await aiChat(messages, MODELS.tokens, true, 2048, userId)
  try {
    return JSON.parse(res.text) as BreakdownProposal
  } catch {
    return { modules: [], pages: [] }
  }
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

Given the conversation context and the specific item name, generate comprehensive documentation in this EXACT format:

## Business Context
[Why this exists, what business problem it solves, who uses it]

## Functional Requirements
[Numbered list of specific functional requirements]

## Logic and Business Rules
[Business rules, conditions, triggers, calculations]

## Assumptions
[What we're assuming to be true — each must be validated]

## Acceptance Criteria
[Given/When/Then format or clear pass/fail criteria]

## Validations
[Input validations, data validations, format rules]

## Error Messages
[Specific error messages for each failure scenario]

## UI/UX Specifications
[Layout, components, interactions, responsive behavior]

## Impact Assessment
[What other features/pages/modules this affects]

## Open Questions
[Unresolved questions that need stakeholder input]

Be specific to this item. Use the conversation context to fill in real details, not generic placeholders. If something is unknown, say so in Open Questions.`

export async function generateDocumentation(
  context: ElicitationContext,
  conversationHistory: string,
  itemName: string,
  itemType: 'feature' | 'page',
  parentModule?: string,
  linkedFeatures?: string[],
  userId?: number,
): Promise<{ userInput: string; aiDoc: string }> {
  const contextSummary = buildContextSummary(context)
  const linkedInfo = linkedFeatures?.length ? `\nLinked features: ${linkedFeatures.join(', ')}` : ''
  const parentInfo = parentModule ? `\nParent module: ${parentModule}` : ''

  const messages: ChatMessage[] = [
    { role: 'system', content: DOC_PROMPT },
    { role: 'user', content: `Project context:\n${contextSummary}\n\nConversation:\n${conversationHistory}\n\nGenerate documentation for: "${itemName}" (${itemType})${parentInfo}${linkedInfo}` },
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
