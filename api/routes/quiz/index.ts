import { Hono } from 'hono'
import { query } from '../../db.ts'
import { aiChat, MODELS } from '../../lib/ai-client.ts'

const app = new Hono()

// Generate next quiz question for a feature
app.post('/features/:id/question', async (c) => {
  const featureId = Number(c.req.param('id'))
  const userId = c.get('userId')
  const { previousAnswers } = await c.req.json<{ previousAnswers?: { question: string; answer: string }[] }>()

  const feat = await query(
    `SELECT f.*, m.name as module_name, m.path as module_path
     FROM features f JOIN modules m ON m.id = f.module_id WHERE f.id = $1`, [featureId]
  )
  if (!feat.rows.length) return c.json({ error: 'not found' }, 404)
  const f = feat.rows[0]

  const prevContext = previousAnswers?.length
    ? `\n\nPrevious answers in this session:\n${previousAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}`
    : ''

  const res = await aiChat([
    { role: 'system', content: `You are a requirements analyst conducting a quiz to improve the confidence score of a software feature. Generate ONE question that will help clarify or validate this feature's requirements.

Rules:
- Ask about gaps in the current documentation — missing validations, unclear business rules, unvalidated assumptions, edge cases not covered
- Generate 4 plausible options (A, B, C, D) that are specific to this feature's context
- Set "multiSelect": true ONLY when multiple options can legitimately coexist (e.g., "Which of these apply?", "What validations are missing?", "Which edge cases should be handled?"). Set false when the answer is mutually exclusive (e.g., "What should happen when...?", "Which approach...?").
- Never ask a question whose answer is already in the documentation or was already answered
- Focus on what would most improve the Feature Confidence Score
- Questions should feel like a smart BA probing for clarity, not a generic quiz

PURPOSE-PROBING ("why") QUESTIONS — include these ROUGHLY 1 OUT OF EVERY 3 questions (not every time, but regularly):
These anchor the feature to real business motivation and surface hidden assumptions. Examples:
- "Why does this feature matter to the business — what's the measurable outcome?" options: [increase revenue, reduce support load, compliance requirement, retention/engagement]
- "What breaks for the user today without this feature?" options: [blocks a task entirely, adds friction/time, forces workarounds, no impact — nice-to-have]
- "Why must this validation exist — what risk does it prevent?" options: [fraud/security, data corruption, poor UX, regulatory]
- "Why this priority ordering — what's the primary success metric?" options: [speed, accuracy, user confidence, cost]
Set contextKey to "purpose" or "business_rules" for these. Purpose answers heavily boost the feature's confidence because they drive acceptance criteria.

When picking the next question: if the existing documentation already has rich "why" context captured (purpose/motivation), skip purpose questions and focus on gap-filling. If purpose is thin or missing, lead with a why.

Return valid JSON:
{
  "question": "The question text",
  "options": [
    { "id": "A", "label": "Option A text" },
    { "id": "B", "label": "Option B text" },
    { "id": "C", "label": "Option C text" },
    { "id": "D", "label": "Option D text" }
  ],
  "multiSelect": false,
  "contextKey": "which BRD section this improves (e.g., validations, business_rules, edge_cases, assumptions)",
  "confidenceImpact": "estimated FCS improvement if answered (e.g., +5%)"
}` },
    { role: 'user', content: `Feature: ${f.name}\nModule: ${f.module_name}\n\nCurrent documentation:\n${(f.ai_description || '').slice(0, 3000)}${prevContext}\n\nGenerate the next question.` }
  ], MODELS.tokens, true, 512, userId)

  try {
    const question = JSON.parse(res.text)
    return c.json(question)
  } catch {
    return c.json({ question: res.text, options: [], contextKey: 'general', confidenceImpact: '+3%' })
  }
})

// Submit quiz answer — updates feature documentation and recalculates FCS
app.post('/features/:id/answer', async (c) => {
  const featureId = Number(c.req.param('id'))
  const userId = c.get('userId')
  const { question, answer, contextKey } = await c.req.json<{
    question: string; answer: string; contextKey: string
  }>()

  const feat = await query(`SELECT * FROM features WHERE id = $1`, [featureId])
  if (!feat.rows.length) return c.json({ error: 'not found' }, 404)
  const f = feat.rows[0]

  // Fast path: append answer to the relevant BRD section directly (no AI)
  const sectionTitle = ({
    validations: 'Validations',
    business_rules: 'Logic and Business Rules',
    edge_cases: 'Edge Cases',
    assumptions: 'Assumptions',
    error_messages: 'Error Messages',
    acceptance_criteria: 'Acceptance Criteria',
    functional_requirements: 'Functional Requirements',
    purpose: 'Business Context',
    motivation: 'Business Context',
  } as Record<string, string>)[contextKey] || 'Open Questions'

  let desc: string = f.ai_description || ''
  const bullet = `- ${answer} _(Q: ${question})_`
  const header = `## ${sectionTitle}`
  const idx = desc.indexOf(header)
  if (idx !== -1) {
    const next = desc.indexOf('\n## ', idx + header.length)
    const insertAt = next !== -1 ? next : desc.length
    desc = desc.slice(0, insertAt) + `\n${bullet}\n` + desc.slice(insertAt)
  } else {
    desc += `\n\n${header}\n${bullet}\n`
  }

  // Recalculate confidence score on the patched description
  const sections = desc.split('## ').filter(Boolean)
  const filledSections = sections.filter((s: string) => s.trim().split('\n').length > 2)
  const dScore = Math.min(1, filledSections.length / 15)
  const currentScore = f.confidence_score || {}
  const eScore = Math.min(1, (currentScore.elicitationDepth || 0) + 0.08)
  const aScore = Math.min(1, (currentScore.assumptionRisk || 0) + 0.05)

  const newScore = {
    documentation: Math.round(dScore * 100) / 100,
    elicitationDepth: Math.round(eScore * 100) / 100,
    assumptionRisk: Math.round(aScore * 100) / 100,
    stability: currentScore.stability || 1.0,
    prototypeValidation: currentScore.prototypeValidation || 0.2,
    overall: 0,
  }
  newScore.overall = Math.round(((newScore.documentation * 0.25) + (newScore.elicitationDepth * 0.25) + (newScore.assumptionRisk * 0.20) + (newScore.stability * 0.15) + (newScore.prototypeValidation * 0.15)) * 100) / 100

  await query(
    `UPDATE features SET ai_description = $1, confidence_score = $2, updated_at = NOW() WHERE id = $3`,
    [desc, JSON.stringify(newScore), featureId]
  )

  // Fire-and-forget: AI polish to integrate the bullet naturally into the prose
  ;(async () => {
    try {
      const res = await aiChat([
        { role: 'system', content: `You polish BRD docs. Rewrite only the "## ${sectionTitle}" section so the new bullet is integrated naturally with existing content (dedupe, reorder, reword). Keep all other sections EXACTLY as-is. Return the full documentation.` },
        { role: 'user', content: desc }
      ], MODELS.tokens, false, 2048, userId)
      const polished = res.text
      const summary = polished.split('\n').find((l: string) => l.trim() && !l.startsWith('#'))?.trim().slice(0, 200) || f.name
      await query(`UPDATE features SET ai_description = $1, summary = $2 WHERE id = $3`, [polished, summary, featureId])
    } catch {}
  })()

  return c.json({ ok: true, newScore, updatedDescription: desc })
})

// Skip question — save as open question
app.post('/features/:id/skip', async (c) => {
  const featureId = Number(c.req.param('id'))
  const { question } = await c.req.json<{ question: string }>()

  const feat = await query(`SELECT ai_description FROM features WHERE id = $1`, [featureId])
  if (!feat.rows.length) return c.json({ error: 'not found' }, 404)

  let desc = feat.rows[0].ai_description || ''
  const openQSection = desc.indexOf('## Open Questions')
  if (openQSection !== -1) {
    const nextSection = desc.indexOf('\n## ', openQSection + 5)
    const insertAt = nextSection !== -1 ? nextSection : desc.length
    desc = desc.slice(0, insertAt) + `\n- ${question} (skipped — needs answer)\n` + desc.slice(insertAt)
  } else {
    desc += `\n\n## Open Questions\n- ${question} (skipped — needs answer)\n`
  }
  await query(`UPDATE features SET ai_description = $1 WHERE id = $2`, [desc, featureId])

  return c.json({ ok: true })
})

export default app
