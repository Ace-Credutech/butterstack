// Version history — persisted to DB on every generate/regenerate/approve.
// POST /history        — save a version entry
// GET  /history        — fetch project history (paginated)
// PATCH /history/:id/approve — toggle approved flag

import { Hono } from 'hono'
import { query } from '../../db.ts'

const app = new Hono()

// Save a version entry (called after every generate/regenerate)
app.post('/', async (c) => {
  const { label, rawTitle, rawDescription, cleanPrompt, tokens, source, moduleId, modulePath, projectId = 'default' } =
    await c.req.json<{
      label: string; rawTitle?: string; rawDescription?: string
      cleanPrompt: string; tokens: object; source?: string
      moduleId?: number | null; modulePath?: string[]; projectId?: string
    }>()

  if (!tokens || !label) return c.json({ error: 'label and tokens required' }, 400)

  const result = await query(
    `INSERT INTO version_history (project_id, module_id, label, raw_title, raw_description, clean_prompt, tokens, source, module_path)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, created_at`,
    [projectId, moduleId ?? null, label, rawTitle ?? null, rawDescription ?? null,
     cleanPrompt, JSON.stringify(tokens), source ?? null,
     modulePath ? JSON.stringify(modulePath) : null]
  )

  return c.json(result.rows[0], 201)
})

// Fetch history for a project (most recent first)
app.get('/', async (c) => {
  const projectId = c.req.query('projectId') ?? 'default'
  const limit     = parseInt(c.req.query('limit') ?? '50')
  const offset    = parseInt(c.req.query('offset') ?? '0')

  const result = await query(
    `SELECT h.id, h.label, h.raw_title, h.raw_description, h.clean_prompt,
            h.tokens, h.source, h.approved, h.approved_at, h.module_path,
            h.created_at, m.name AS module_name, m.path AS module_path_str
     FROM version_history h
     LEFT JOIN modules m ON h.module_id = m.id
     WHERE h.project_id = $1
     ORDER BY h.created_at DESC
     LIMIT $2 OFFSET $3`,
    [projectId, limit, offset]
  )

  return c.json({ history: result.rows, limit, offset })
})

// Approve / un-approve a version
app.patch('/:id/approve', async (c) => {
  const id = parseInt(c.req.param('id'))
  const { approved } = await c.req.json<{ approved: boolean }>()

  await query(
    `UPDATE version_history SET approved = $1, approved_at = $2 WHERE id = $3`,
    [approved, approved ? new Date() : null, id]
  )

  return c.json({ ok: true })
})

export default app
