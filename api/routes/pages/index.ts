import { Hono } from 'hono'
import { query } from '../../db.ts'

const app = new Hono()

app.post('/', async (c) => {
  const { name, projectId = 'default', pageType, rawDescription, aiDescription, tokens } = await c.req.json<{
    name: string; projectId?: string; pageType?: string; rawDescription?: string; aiDescription?: string; tokens?: unknown
  }>()

  if (!name?.trim()) return c.json({ error: 'name required' }, 400)

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const userId = c.get('userId')

  const result = await query(
    `INSERT INTO pages (project_id, name, slug, page_type, raw_description, ai_description, tokens, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [projectId, name.trim(), slug, pageType ?? null, rawDescription ?? null, aiDescription ?? null, tokens ? JSON.stringify(tokens) : null, userId]
  )
  return c.json(result.rows[0], 201)
})

app.get('/', async (c) => {
  const projectId = c.req.query('projectId') || 'default'
  const result = await query(
    `SELECT p.*, COALESCE(
       (SELECT json_agg(json_build_object('id', f.id, 'name', f.name, 'moduleName', m.name))
        FROM page_features pf JOIN features f ON f.id = pf.feature_id JOIN modules m ON m.id = f.module_id
        WHERE pf.page_id = p.id), '[]'
     ) as features
     FROM pages p WHERE p.project_id = $1 ORDER BY p.order_index, p.name`, [projectId]
  )
  return c.json(result.rows)
})

app.get('/:id', async (c) => {
  const result = await query(
    `SELECT p.*, COALESCE(
       (SELECT json_agg(json_build_object('id', f.id, 'name', f.name, 'moduleName', m.name, 'moduleId', m.id))
        FROM page_features pf JOIN features f ON f.id = pf.feature_id JOIN modules m ON m.id = f.module_id
        WHERE pf.page_id = p.id), '[]'
     ) as features
     FROM pages p WHERE p.id = $1`, [c.req.param('id')]
  )
  if (!result.rows.length) return c.json({ error: 'not found' }, 404)
  return c.json(result.rows[0])
})

app.patch('/:id', async (c) => {
  const { name, pageType, rawDescription, aiDescription, tokens, status } = await c.req.json<{
    name?: string; pageType?: string; rawDescription?: string; aiDescription?: string; tokens?: unknown; status?: string
  }>()
  await query(
    `UPDATE pages SET name = COALESCE($1, name), page_type = COALESCE($2, page_type),
     raw_description = COALESCE($3, raw_description), ai_description = COALESCE($4, ai_description),
     tokens = COALESCE($5, tokens), status = COALESCE($6, status), updated_at = NOW() WHERE id = $7`,
    [name ?? null, pageType ?? null, rawDescription ?? null, aiDescription ?? null, tokens ? JSON.stringify(tokens) : null, status ?? null, c.req.param('id')]
  )
  return c.json({ ok: true })
})

app.delete('/:id', async (c) => {
  await query(`DELETE FROM pages WHERE id = $1`, [c.req.param('id')])
  return c.json({ ok: true })
})

app.post('/:id/features', async (c) => {
  const pageId = c.req.param('id')
  const { featureIds } = await c.req.json<{ featureIds: number[] }>()
  for (const fId of featureIds) {
    await query(
      `INSERT INTO page_features (page_id, feature_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [pageId, fId]
    )
  }
  return c.json({ ok: true })
})

app.delete('/:id/features/:featureId', async (c) => {
  await query(`DELETE FROM page_features WHERE page_id = $1 AND feature_id = $2`,
    [c.req.param('id'), c.req.param('featureId')])
  return c.json({ ok: true })
})

export default app
