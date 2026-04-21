import { Hono } from 'hono'
import { query } from '../../db.ts'
import { generateDocumentation, buildContextSummary, type ElicitationContext } from '../../lib/elicitation.ts'
import { extractTokens } from '../../lib/openai.ts'
import { aiChat, MODELS } from '../../lib/ai-client.ts'

const app = new Hono()

// Reprocess a feature/page/module — regenerate AI docs, prototype, and cascade to affected entities
app.post('/:entityType/:entityId', async (c) => {
  const entityType = c.req.param('entityType') as 'feature' | 'page' | 'module'
  const entityId = Number(c.req.param('entityId'))
  const userId = c.get('userId')
  const { rawDescription } = await c.req.json<{ rawDescription?: string }>()

  // Update raw description if provided
  if (rawDescription !== undefined) {
    const table = entityType === 'feature' ? 'features' : entityType === 'page' ? 'pages' : 'modules'
    const col = entityType === 'module' ? 'user_input' : 'raw_description'
    await query(`UPDATE ${table} SET ${col} = $1, updated_at = NOW() WHERE id = $2`, [rawDescription, entityId])
  }

  // Fire background reprocess
  reprocessEntity(entityType, entityId, userId).catch(() => {})

  return c.json({ ok: true, message: 'Reprocessing started' })
})

async function reprocessEntity(entityType: string, entityId: number, userId: number) {
  if (entityType === 'feature') {
    await reprocessFeature(entityId, userId)
  } else if (entityType === 'page') {
    await reprocessPage(entityId, userId)
  } else if (entityType === 'module') {
    await reprocessModule(entityId, userId)
  }
}

async function reprocessFeature(featureId: number, userId: number) {
  const feat = await query(
    `SELECT f.*, m.name as module_name, m.path as module_path
     FROM features f JOIN modules m ON m.id = f.module_id WHERE f.id = $1`, [featureId]
  )
  if (!feat.rows.length) return
  const f = feat.rows[0]

  // Get project conversation context
  const convContext = await getProjectConversationContext(f.project_id)

  // Regenerate AI documentation
  try {
    const doc = await generateDocumentation(
      { rawInput: f.raw_description || f.name, features: [f.name] } as ElicitationContext,
      convContext, f.name, 'feature', `${f.module_name}`, undefined, userId
    )
    await query(`UPDATE features SET ai_description = $1, updated_at = NOW() WHERE id = $2`, [doc.aiDoc, featureId])

    // Regenerate summary + confidence
    const sections = doc.aiDoc.split('## ').filter(Boolean)
    const filled = sections.filter(s => s.trim().split('\n').length > 2)
    const completeness = sections.length ? filled.length / Math.max(sections.length, 10) : 0
    const summary = doc.aiDoc.split('\n').find(l => l.trim() && !l.startsWith('#'))?.trim().slice(0, 200) || f.name

    await query(
      `UPDATE features SET summary = $1, confidence_score = $2 WHERE id = $3`,
      [summary, JSON.stringify({ completeness: Math.round(completeness * 100) / 100, stability: 0.8, intentFidelity: 0.9 }), featureId]
    )

    // Regenerate test cases
    try {
      const tcRes = await aiChat(
        [{ role: 'system', content: 'Generate test cases in Given/When/Then format for this feature.' },
         { role: 'user', content: `Feature: ${f.name}\n${doc.aiDoc.slice(0, 2000)}` }],
        MODELS.tokens, false, 512, userId
      )
      await query(`UPDATE features SET test_cases = $1 WHERE id = $2`, [tcRes.text, featureId])
    } catch {}
  } catch {}

  // Find linked pages and reprocess them too
  const linkedPages = await query(
    `SELECT p.id FROM page_features pf JOIN pages p ON p.id = pf.page_id WHERE pf.feature_id = $1`, [featureId]
  )
  for (const page of linkedPages.rows) {
    await reprocessPage(page.id, userId)
  }
}

async function reprocessPage(pageId: number, userId: number) {
  const page = await query(`SELECT * FROM pages WHERE id = $1`, [pageId])
  if (!page.rows.length) return
  const p = page.rows[0]

  // Get linked feature names
  const linkedFeats = await query(
    `SELECT f.name FROM page_features pf JOIN features f ON f.id = pf.feature_id WHERE pf.page_id = $1`, [pageId]
  )
  const featNames = linkedFeats.rows.map((f: any) => f.name)

  const convContext = await getProjectConversationContext(p.project_id)

  // Regenerate AI documentation
  try {
    const doc = await generateDocumentation(
      { rawInput: p.raw_description || p.name, features: featNames } as ElicitationContext,
      convContext, p.name, 'page', undefined, featNames, userId
    )
    await query(`UPDATE pages SET ai_description = $1, updated_at = NOW() WHERE id = $2`, [doc.aiDoc, pageId])

    const summary = doc.aiDoc.split('\n').find(l => l.trim() && !l.startsWith('#'))?.trim().slice(0, 200) || p.name
    await query(`UPDATE pages SET summary = $1 WHERE id = $2`, [summary, pageId])
  } catch {}

  // Regenerate prototype tokens with conversation context
  try {
    const pagePrompt = `${p.name} - ${p.page_type || 'page'} page with: ${featNames.join(', ')}. Context: ${p.raw_description || ''}`
    const tokenResult = await extractTokens(pagePrompt)
    await query(`UPDATE pages SET tokens = $1 WHERE id = $2`, [JSON.stringify(tokenResult.tokens), pageId])
  } catch {}
}

async function reprocessModule(moduleId: number, userId: number) {
  // Reprocess all features under this module
  const features = await query(`SELECT id FROM features WHERE module_id = $1`, [moduleId])
  for (const f of features.rows) {
    await reprocessFeature(f.id, userId)
  }

  // Also reprocess child modules
  const children = await query(`SELECT id FROM modules WHERE parent_id = $1`, [moduleId])
  for (const child of children.rows) {
    await reprocessModule(child.id, userId)
  }
}

async function getProjectConversationContext(projectId: string): Promise<string> {
  const sessions = await query(
    `SELECT summary FROM elicitation_sessions WHERE project_id = $1 AND summary IS NOT NULL ORDER BY updated_at DESC LIMIT 5`,
    [projectId]
  )
  if (!sessions.rows.length) return ''
  return sessions.rows.map((s: any, i: number) => `Session ${i + 1}: ${s.summary}`).join('\n')
}

export default app
