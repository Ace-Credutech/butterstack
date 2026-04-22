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
  const { rawDescription } = await c.req.json<{ rawDescription?: string }>().catch(() => ({ rawDescription: undefined }))

  if (rawDescription !== undefined) {
    const table = entityType === 'feature' ? 'features' : entityType === 'page' ? 'pages' : 'modules'
    const col = entityType === 'module' ? 'user_input' : 'raw_description'
    await query(`UPDATE ${table} SET ${col} = $1, updated_at = NOW() WHERE id = $2`, [rawDescription, entityId])
  }

  // Look up project_id for the job row (best-effort)
  let projectId: string | null = null
  try {
    const t = entityType === 'feature' ? 'features' : entityType === 'page' ? 'pages' : 'modules'
    const r = await query(`SELECT project_id FROM ${t} WHERE id = $1`, [entityId])
    projectId = r.rows[0]?.project_id ?? null
  } catch {}

  const job = await query(
    `INSERT INTO reprocess_jobs (project_id, entity_type, entity_id, user_id, status, step) VALUES ($1, $2, $3, $4, 'pending', 'queued') RETURNING id`,
    [projectId, entityType, entityId, userId]
  )
  const jobId: number = job.rows[0].id

  ;(async () => {
    await query(`UPDATE reprocess_jobs SET status = 'running', started_at = NOW(), step = 'starting' WHERE id = $1`, [jobId])
    try {
      await reprocessEntity(entityType, entityId, userId, jobId)
      await query(`UPDATE reprocess_jobs SET status = 'done', step = 'done', finished_at = NOW() WHERE id = $1`, [jobId])
    } catch (err: any) {
      await query(`UPDATE reprocess_jobs SET status = 'failed', error = $2, finished_at = NOW() WHERE id = $1`, [jobId, String(err?.message || err)])
    }
  })()

  return c.json({ ok: true, jobId, message: 'Reprocessing started' })
})

app.get('/status/:jobId', async (c) => {
  const jobId = Number(c.req.param('jobId'))
  const r = await query(
    `SELECT id, entity_type, entity_id, status, step, error, created_at, started_at, finished_at FROM reprocess_jobs WHERE id = $1`,
    [jobId]
  )
  if (!r.rows.length) return c.json({ error: 'not found' }, 404)
  return c.json(r.rows[0])
})

// Latest job(s) for an entity — used by UI to show ambient status when opening a feature/page
app.get('/status/by-entity/:entityType/:entityId', async (c) => {
  const entityType = c.req.param('entityType')
  const entityId = Number(c.req.param('entityId'))
  const r = await query(
    `SELECT id, status, step, error, created_at, started_at, finished_at FROM reprocess_jobs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC LIMIT 5`,
    [entityType, entityId]
  )
  return c.json(r.rows)
})

async function setStep(jobId: number | undefined, step: string) {
  if (!jobId) return
  try { await query(`UPDATE reprocess_jobs SET step = $2 WHERE id = $1`, [jobId, step]) } catch {}
}

async function reprocessEntity(entityType: string, entityId: number, userId: number, jobId?: number) {
  if (entityType === 'feature') {
    await reprocessFeature(entityId, userId, jobId)
  } else if (entityType === 'page') {
    await reprocessPage(entityId, userId, jobId)
  } else if (entityType === 'module') {
    await reprocessModule(entityId, userId, jobId)
  }
}

async function reprocessFeature(featureId: number, userId: number, jobId?: number) {
  await setStep(jobId, `feature:${featureId} loading`)
  const feat = await query(
    `SELECT f.*, m.name as module_name, m.path as module_path
     FROM features f JOIN modules m ON m.id = f.module_id WHERE f.id = $1`, [featureId]
  )
  if (!feat.rows.length) return
  const f = feat.rows[0]

  // Pull BOTH: prior session summaries AND recent raw user messages across all sessions in this project.
  // The raw messages are the source of truth for any corrections/additions the user made.
  const [priorSummaries, recentTranscript] = await Promise.all([
    getPriorSessionSummaries(f.project_id),
    getRecentProjectTranscript(f.project_id),
  ])

  // Regenerate AI documentation — pass existing doc so updates are incremental, not replacements
  try {
    await setStep(jobId, `feature:${featureId} documentation`)
    const doc = await generateDocumentation(
      { rawInput: f.raw_description || f.name, features: [f.name] } as ElicitationContext,
      recentTranscript, f.name, 'feature', `${f.module_name}`, undefined, userId,
      priorSummaries, f.ai_description || undefined
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
      await setStep(jobId, `feature:${featureId} test cases`)
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
    await reprocessPage(page.id, userId, jobId)
  }
}

async function reprocessPage(pageId: number, userId: number, jobId?: number) {
  await setStep(jobId, `page:${pageId} loading`)
  const page = await query(`SELECT * FROM pages WHERE id = $1`, [pageId])
  if (!page.rows.length) return
  const p = page.rows[0]

  // Get linked feature names + their UI/UX-relevant descriptions (authoritative vocabulary for tokens)
  const linkedFeats = await query(
    `SELECT f.name, f.ai_description FROM page_features pf JOIN features f ON f.id = pf.feature_id WHERE pf.page_id = $1`, [pageId]
  )
  const featNames = linkedFeats.rows.map((f: any) => f.name)

  const [priorSummaries, recentTranscript] = await Promise.all([
    getPriorSessionSummaries(p.project_id),
    getRecentProjectTranscript(p.project_id),
  ])

  // Regenerate page AI documentation FIRST (incremental — feeds token extraction next)
  let freshDoc = p.ai_description || ''
  try {
    await setStep(jobId, `page:${pageId} documentation`)
    const doc = await generateDocumentation(
      { rawInput: p.raw_description || p.name, features: featNames } as ElicitationContext,
      recentTranscript, p.name, 'page', undefined, featNames, userId,
      priorSummaries, p.ai_description || undefined
    )
    freshDoc = doc.aiDoc
    await query(`UPDATE pages SET ai_description = $1, updated_at = NOW() WHERE id = $2`, [doc.aiDoc, pageId])

    const summary = doc.aiDoc.split('\n').find(l => l.trim() && !l.startsWith('#'))?.trim().slice(0, 200) || p.name
    await query(`UPDATE pages SET summary = $1 WHERE id = $2`, [summary, pageId])
  } catch {}

  // Build token prompt from fresh doc's UI vocabulary + linked features' own doc UI sections
  const pickSection = (src: string, title: string) => {
    const re = new RegExp(`##\\s*${title}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i')
    return (src.match(re)?.[1] || '').trim()
  }
  const pageUI = pickSection(freshDoc, 'UI/UX Specifications') || pickSection(freshDoc, 'UI/UX')
  const pageValidations = pickSection(freshDoc, 'Validations')
  const pageErrors = pickSection(freshDoc, 'Error Messages')
  const featureHints = linkedFeats.rows.map((fr: any) => {
    const ui = pickSection(fr.ai_description || '', 'UI/UX Specifications') || pickSection(fr.ai_description || '', 'UI/UX')
    return `${fr.name}:\n${ui.slice(0, 500)}`
  }).filter((s: string) => s.split(':\n')[1]?.trim()).join('\n\n')

  const auxLinkFeatures = featNames.filter(f =>
    /registration|register|sign[- ]?up|password reset|forgot|t&c|terms|help/i.test(f)
  )
  const pagePrompt = [
    `${p.name} — ${p.page_type || 'page'} page with features: ${featNames.join(', ')}.`,
    `AUTHORITATIVE UI/UX spec — use these EXACT field names, labels, button text, and links:`,
    pageUI && `Page UI/UX:\n${pageUI.slice(0, 1000)}`,
    featureHints && `Linked feature UI specs:\n${featureHints}`,
    pageValidations && `Validations:\n${pageValidations.slice(0, 500)}`,
    pageErrors && `Error messages:\n${pageErrors.slice(0, 400)}`,
    auxLinkFeatures.length && `IMPORTANT: Every one of these linked auxiliary flows MUST appear as a visible link in this page's "navigation" token array (using the user's own wording for the link label): ${auxLinkFeatures.join(', ')}. Do NOT omit them just because they are separate features.`,
  ].filter(Boolean).join('\n\n')

  try {
    await setStep(jobId, `page:${pageId} prototype tokens`)
    const tokenResult = await extractTokens(pagePrompt, { bypassCache: true })
    await query(`UPDATE pages SET tokens = $1 WHERE id = $2`, [JSON.stringify(tokenResult.tokens), pageId])
  } catch {}
}

async function reprocessModule(moduleId: number, userId: number, jobId?: number) {
  await setStep(jobId, `module:${moduleId} loading children`)
  // Reprocess all features under this module
  const features = await query(`SELECT id FROM features WHERE module_id = $1`, [moduleId])
  for (const f of features.rows) {
    await reprocessFeature(f.id, userId, jobId)
  }

  // Also reprocess child modules
  const children = await query(`SELECT id FROM modules WHERE parent_id = $1`, [moduleId])
  for (const child of children.rows) {
    await reprocessModule(child.id, userId, jobId)
  }
}

async function getPriorSessionSummaries(projectId: string): Promise<string[]> {
  const sessions = await query(
    `SELECT summary FROM elicitation_sessions WHERE project_id = $1 AND summary IS NOT NULL ORDER BY updated_at DESC LIMIT 5`,
    [projectId]
  )
  return sessions.rows.map((s: any) => s.summary).filter(Boolean)
}

// Pull recent raw conversation transcript for the project — these are the source-of-truth for any
// corrections/additions a user made in chat (e.g. "Username nahi, Email chahiye"). Reprocess MUST use
// this, not just summaries, otherwise late-breaking intent is lost.
async function getRecentProjectTranscript(projectId: string): Promise<string> {
  const rows = await query(
    `SELECT em.role, em.content, em.created_at
     FROM elicitation_messages em
     JOIN elicitation_sessions es ON es.id = em.session_id
     WHERE es.project_id = $1
     ORDER BY em.created_at DESC
     LIMIT 60`,
    [projectId]
  )
  return rows.rows
    .reverse()
    .map((m: any) => `${m.role}: ${m.content}`)
    .join('\n')
}

export default app
