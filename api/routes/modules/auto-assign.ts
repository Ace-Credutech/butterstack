// Auto-assigns a requirement to a module/sub-module path using AI.
// AI looks at the tokens and label → suggests a path like ["Authentication", "Login"]
// Creates any missing modules in the tree, returns the leaf moduleId.

import { Hono }           from 'hono'
import { query }          from '../../db.ts'
import { aiChat, MODELS } from '../../lib/ai-client.ts'
import type { UITokens }  from '../../lib/openai.ts'

const app = new Hono()

const SYSTEM_PROMPT = `You are a software architect organizing UI features into a module tree.
Given a UI feature's tokens and label, return a JSON object:
{
  "path": ["TopLevelModule", "SubModule"]   // 1-3 levels, title case, no special chars
}

Rules:
- Top level = broad domain (Authentication, Dashboard, Settings, Reports, etc.)
- Sub level = specific feature area (Login, User Profile, Invoice List, etc.)
- Max 3 levels deep
- Use existing module names if they fit — don't create duplicates
- Return only valid JSON.`

app.post('/auto-assign', async (c) => {
  const { tokens, label, cleanPrompt, projectId = 'default' } =
    await c.req.json<{ tokens: UITokens; label: string; cleanPrompt: string; projectId?: string }>()

  if (!tokens || !label) return c.json({ error: 'tokens and label required' }, 400)

  // Get existing module names so AI can reuse them
  const existing = await query(
    `SELECT name, depth, path FROM modules WHERE project_id = $1 ORDER BY depth, name`,
    [projectId]
  )
  const existingNames = existing.rows.map((r: any) => r.name)

  // Ask AI for the module path
  const userMsg = `
Label: "${label}"
Clean prompt: "${cleanPrompt}"
Page type: ${tokens.page_type}
Entity: ${tokens.entity}
Intent: ${tokens.intent}
Existing modules: ${existingNames.length ? existingNames.join(', ') : 'none yet'}
`.trim()

  const res  = await aiChat(
    [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMsg }],
    MODELS.streamline,   // cheap model — simple classification task
    true
  )

  let suggestedPath: string[] = []
  try {
    const parsed = JSON.parse(res.text)
    suggestedPath = Array.isArray(parsed.path) ? parsed.path.filter(Boolean) : []
  } catch {
    suggestedPath = ['General']
  }

  if (!suggestedPath.length) suggestedPath = ['General']

  // Walk the path — find or create each module node
  let parentId: number | null = null
  let leafId   = 0
  let leafPath = ''

  for (let i = 0; i < suggestedPath.length; i++) {
    const name = suggestedPath[i].trim()
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Try to find existing node at this level under same parent
    const found = await query(
      `SELECT id, depth, path FROM modules
       WHERE project_id = $1 AND slug = $2 AND (parent_id = $3 OR (parent_id IS NULL AND $3::int IS NULL))`,
      [projectId, slug, parentId]
    )

    if (found.rows.length) {
      parentId = found.rows[0].id
      leafId   = found.rows[0].id
      leafPath = found.rows[0].path
    } else {
      // Create it
      const parentCtx = parentId
        ? await query(`SELECT depth, path FROM modules WHERE id = $1`, [parentId])
        : null

      const depth = parentCtx ? parentCtx.rows[0].depth + 1 : 0
      const path  = parentCtx ? `${parentCtx.rows[0].path}/${slug}` : slug

      const created = await query(
        `INSERT INTO modules (project_id, name, slug, parent_id, depth, path, order_index)
         VALUES ($1,$2,$3,$4,$5,$6,0) RETURNING id, depth, path`,
        [projectId, name, slug, parentId, depth, path]
      )
      parentId = created.rows[0].id
      leafId   = created.rows[0].id
      leafPath = created.rows[0].path
    }
  }

  return c.json({
    moduleId:   leafId,
    modulePath: suggestedPath,
    path:       leafPath,
  })
})

export default app
