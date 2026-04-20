import { Hono } from 'hono'
import { query } from '../../db.ts'
import {
  generateNextQuestion, shouldPropose, generateBreakdown, updateContext, generateDocumentation,
  type ElicitationContext, type BreakdownProposal
} from '../../lib/elicitation.ts'
import { extractTokens } from '../../lib/openai.ts'
import { aiChat, MODELS } from '../../lib/ai-client.ts'

function extractSection(text: string, sectionName: string): string {
  const re = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`)
  const match = text.match(re)
  return match ? match[1].trim() : ''
}

const app = new Hono()

app.post('/sessions', async (c) => {
  const { projectId = 'default' } = await c.req.json<{ projectId?: string }>()
  const userId = c.get('userId')
  const result = await query(
    `INSERT INTO elicitation_sessions (project_id, user_id, context) VALUES ($1, $2, '{}') RETURNING id, project_id, status, created_at`,
    [projectId, userId]
  )
  return c.json(result.rows[0], 201)
})

app.get('/sessions', async (c) => {
  const projectId = c.req.query('projectId') || 'default'
  const result = await query(
    `SELECT es.*, u.name as user_name,
       (SELECT COUNT(*) FROM elicitation_messages em WHERE em.session_id = es.id) as message_count
     FROM elicitation_sessions es JOIN users u ON u.id = es.user_id
     WHERE es.project_id = $1 ORDER BY es.updated_at DESC`,
    [projectId]
  )
  return c.json(result.rows)
})

app.get('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id')
  const session = await query(`SELECT * FROM elicitation_sessions WHERE id = $1`, [sessionId])
  if (!session.rows.length) return c.json({ error: 'not found' }, 404)

  const messages = await query(
    `SELECT * FROM elicitation_messages WHERE session_id = $1 ORDER BY created_at`, [sessionId]
  )
  return c.json({ ...session.rows[0], messages: messages.rows })
})

app.post('/sessions/:id/messages', async (c) => {
  const sessionId = c.req.param('id')
  const { content, type = 'text', selected } = await c.req.json<{
    content: string; type?: string; selected?: string | string[]
  }>()

  const session = await query(`SELECT * FROM elicitation_sessions WHERE id = $1`, [sessionId])
  if (!session.rows.length) return c.json({ error: 'session not found' }, 404)

  if (session.rows[0].status === 'completed') {
    await query(`UPDATE elicitation_sessions SET status = 'active', updated_at = NOW() WHERE id = $1`, [sessionId])
  }

  let context: ElicitationContext = session.rows[0].context || { rawInput: '' }

  await query(
    `INSERT INTO elicitation_messages (session_id, role, content, message_type, selected) VALUES ($1, 'user', $2, $3, $4)`,
    [sessionId, content, type, selected ? JSON.stringify(selected) : null]
  )

  if (!context.rawInput && type === 'text') {
    context.rawInput = content
    const title = content.length > 60 ? content.slice(0, 57) + '...' : content
    await query(`UPDATE elicitation_sessions SET title = $1 WHERE id = $2 AND title IS NULL`, [title, sessionId])
  }

  const prevMessages = await query(
    `SELECT role, content, message_type, options, metadata FROM elicitation_messages WHERE session_id = $1 ORDER BY created_at`,
    [sessionId]
  )

  if (selected) {
    const lastAssistant = [...prevMessages.rows].reverse().find(m => m.role === 'assistant' && m.metadata?.contextKey)
    if (lastAssistant) {
      context = updateContext(context, lastAssistant.metadata.contextKey, selected)
    }
  } else if (type === 'text') {
    const lastAssistant = [...prevMessages.rows].reverse().find(m => m.role === 'assistant' && m.metadata?.contextKey)
    if (lastAssistant) {
      context = updateContext(context, lastAssistant.metadata.contextKey, content)
    }
    if (!context.features) context.features = []
    context.features.push(content)
  }

  await query(`UPDATE elicitation_sessions SET context = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(context), sessionId])

  const history = prevMessages.rows.map((m: any) => ({ role: m.role, content: m.content }))

  const userMessageCount = prevMessages.rows.filter((m: any) => m.role === 'user').length

  if (shouldPropose(context, userMessageCount, content)) {
    const existingModules = await query(
      `SELECT name FROM modules WHERE project_id = $1`, [session.rows[0].project_id]
    )
    const moduleNames = existingModules.rows.map((r: any) => r.name)
    const breakdown = await generateBreakdown(context, moduleNames)

    const assistantMsg = {
      text: 'Based on our conversation, here\'s the proposed structure for your project:',
      type: 'breakdown_proposal',
      breakdown,
    }

    await query(
      `INSERT INTO elicitation_messages (session_id, role, content, message_type, metadata)
       VALUES ($1, 'assistant', $2, 'breakdown_proposal', $3)`,
      [sessionId, assistantMsg.text, JSON.stringify({ breakdown })]
    )

    return c.json({ role: 'assistant', content: assistantMsg.text, type: 'breakdown_proposal', breakdown })
  }

  const prevSessions = await query(
    `SELECT summary FROM elicitation_sessions WHERE project_id = $1 AND id != $2 AND summary IS NOT NULL ORDER BY updated_at DESC LIMIT 5`,
    [session.rows[0].project_id, sessionId]
  )
  const previousSummaries = prevSessions.rows.map((r: any) => r.summary)

  const question = await generateNextQuestion(context, history, previousSummaries)

  await query(
    `INSERT INTO elicitation_messages (session_id, role, content, message_type, options, metadata)
     VALUES ($1, 'assistant', $2, $3, $4, $5)`,
    [sessionId, question.text, question.type, question.options ? JSON.stringify(question.options) : null,
     JSON.stringify({ contextKey: question.contextKey })]
  )

  return c.json({
    role: 'assistant',
    content: question.text,
    type: question.type,
    options: question.options,
  })
})

app.post('/sessions/:id/complete', async (c) => {
  const sessionId = c.req.param('id')
  const userId = c.get('userId')

  const session = await query(`SELECT * FROM elicitation_sessions WHERE id = $1`, [sessionId])
  if (!session.rows.length) return c.json({ error: 'not found' }, 404)

  const proposalMsg = await query(
    `SELECT metadata FROM elicitation_messages WHERE session_id = $1 AND message_type = 'breakdown_proposal' ORDER BY created_at DESC LIMIT 1`,
    [sessionId]
  )
  if (!proposalMsg.rows.length) return c.json({ error: 'no breakdown proposal found' }, 400)

  const breakdown: BreakdownProposal = proposalMsg.rows[0].metadata.breakdown
  const projectId = session.rows[0].project_id
  const context: ElicitationContext = session.rows[0].context || { rawInput: '' }
  const created = { modules: 0, features: 0, pages: 0 }

  const allMessages = await query(
    `SELECT role, content FROM elicitation_messages WHERE session_id = $1 ORDER BY created_at`, [sessionId]
  )
  const conversationHistory = allMessages.rows.map((m: any) => `${m.role}: ${m.content}`).join('\n')

  const featureIdMap: Record<string, number> = {}
  const newFeatureIds: { id: number; name: string; parentPath: string }[] = []
  const newPageIds: { id: number; name: string; linkedFeatures: string[] }[] = []

  // ── Step 1: Create all modules + features + pages (fast, no AI calls) ──

  for (const mod of breakdown.modules) {
    const modSlug = mod.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const modResult = await query(
      `INSERT INTO modules (project_id, name, slug, depth, path) VALUES ($1, $2, $3, 0, $4)
       ON CONFLICT (project_id, slug) DO UPDATE SET name = $2 RETURNING id, (xmax = 0) as inserted`,
      [projectId, mod.name, modSlug, modSlug]
    )
    const modId = modResult.rows[0].id
    if (modResult.rows[0].inserted) created.modules++

    for (const sub of mod.subModules) {
      const subSlug = sub.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const subPath = `${modSlug}/${subSlug}`
      const subResult = await query(
        `INSERT INTO modules (project_id, name, slug, parent_id, depth, path) VALUES ($1, $2, $3, $4, 1, $5)
         ON CONFLICT (project_id, slug) DO UPDATE SET name = $2, parent_id = $4 RETURNING id, (xmax = 0) as inserted`,
        [projectId, sub.name, subSlug, modId, subPath]
      )
      const subId = subResult.rows[0].id
      if (subResult.rows[0].inserted) created.modules++

      for (const feat of sub.features) {
        const featSlug = feat.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const existing = await query(`SELECT id FROM features WHERE module_id = $1 AND slug = $2`, [subId, featSlug])
        if (existing.rows.length) {
          featureIdMap[feat] = existing.rows[0].id
        } else {
          const featResult = await query(
            `INSERT INTO features (project_id, module_id, name, slug, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [projectId, subId, feat, featSlug, userId]
          )
          featureIdMap[feat] = featResult.rows[0].id
          newFeatureIds.push({ id: featResult.rows[0].id, name: feat, parentPath: `${mod.name} > ${sub.name}` })
          created.features++
        }
      }
    }
  }

  for (const page of breakdown.pages) {
    const pageSlug = page.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const pageResult = await query(
      `INSERT INTO pages (project_id, name, slug, page_type, created_by) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (project_id, slug) DO UPDATE SET name = $2, page_type = $4 RETURNING id, (xmax = 0) as inserted`,
      [projectId, page.name, pageSlug, page.pageType, userId]
    )
    const pageId = pageResult.rows[0].id
    if (pageResult.rows[0].inserted) {
      created.pages++
      newPageIds.push({ id: pageId, name: page.name, linkedFeatures: page.linkedFeatures })
    }

    for (const linkedFeat of page.linkedFeatures) {
      const fId = featureIdMap[linkedFeat]
      if (fId) await query(`INSERT INTO page_features (page_id, feature_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [pageId, fId])
    }
  }

  await query(`UPDATE elicitation_sessions SET status = 'completed', updated_at = NOW() WHERE id = $1`, [sessionId])

  // ── Step 2: Background — generate docs + page tokens (fire-and-forget) ──
  const bgWork = async () => {
    const docPromises = newFeatureIds.map(async (f) => {
      try {
        const doc = await generateDocumentation(context, conversationHistory, f.name, 'feature', f.parentPath)
        await query(`UPDATE features SET raw_description = $1, ai_description = $2 WHERE id = $3`, [doc.userInput, doc.aiDoc, f.id])
      } catch {}
    })

    const pagePromises = newPageIds.map(async (p) => {
      try {
        const [doc, tokenResult] = await Promise.all([
          generateDocumentation(context, conversationHistory, p.name, 'page', undefined, p.linkedFeatures),
          extractTokens(`${p.name} page with: ${p.linkedFeatures.join(', ')}`).catch(() => null),
        ])
        await query(
          `UPDATE pages SET raw_description = $1, ai_description = $2, tokens = COALESCE($3, tokens) WHERE id = $4`,
          [doc.userInput, doc.aiDoc, tokenResult ? JSON.stringify(tokenResult.tokens) : null, p.id]
        )
      } catch {}
    })

    await Promise.all([...docPromises, ...pagePromises])

    // After docs generated, generate summaries + confidence + test/use cases
    for (const f of newFeatureIds) {
      try {
        const feat = await query(`SELECT ai_description FROM features WHERE id = $1`, [f.id])
        const aiDesc = feat.rows[0]?.ai_description || ''

        const sections = aiDesc.split('## ').filter(Boolean)
        const filledSections = sections.filter(s => s.trim().split('\n').length > 2)
        const completeness = sections.length ? filledSections.length / Math.max(sections.length, 10) : 0

        const msgCount = allMessages.rows.filter((m: any) => m.role === 'user').length
        const intentFidelity = Math.min(1, msgCount / 5)

        await query(
          `UPDATE features SET
            summary = $1,
            confidence_score = $2,
            test_cases = $3,
            use_cases = $4
          WHERE id = $5`,
          [
            aiDesc.split('\n').find((l: string) => l.trim() && !l.startsWith('#'))?.trim().slice(0, 200) || f.name,
            JSON.stringify({ completeness: Math.round(completeness * 100) / 100, stability: 1.0, intentFidelity: Math.round(intentFidelity * 100) / 100 }),
            extractSection(aiDesc, 'Acceptance Criteria') || null,
            extractSection(aiDesc, 'Business Context') || null,
            f.id
          ]
        )
      } catch {}
    }

    for (const p of newPageIds) {
      try {
        const page = await query(`SELECT ai_description FROM pages WHERE id = $1`, [p.id])
        const summary = (page.rows[0]?.ai_description || '').split('\n').find((l: string) => l.trim() && !l.startsWith('#'))?.trim().slice(0, 200) || p.name
        await query(`UPDATE pages SET summary = $1 WHERE id = $2`, [summary, p.id])
      } catch {}
    }

    // Generate conversation summary for shared context
    try {
      const summaryRes = await aiChat(
        [{ role: 'system', content: 'Summarize the key decisions and context from this requirements conversation in 3-5 bullet points. Be specific about what was decided.' },
         { role: 'user', content: conversationHistory.slice(-3000) }],
        MODELS.tokens, false, 512
      )
      await query(`UPDATE elicitation_sessions SET summary = $1 WHERE id = $2`, [summaryRes.text, sessionId])
    } catch {}
  }
  bgWork().catch(() => {})

  return c.json({ ok: true, created })
})

export default app
