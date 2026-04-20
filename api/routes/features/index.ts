import { Hono } from 'hono'
import { query } from '../../db.ts'

const app = new Hono()

app.post('/', async (c) => {
  const { name, moduleId, projectId = 'default', rawDescription, aiDescription } = await c.req.json<{
    name: string; moduleId: number; projectId?: string; rawDescription?: string; aiDescription?: string
  }>()

  if (!name?.trim() || !moduleId) return c.json({ error: 'name and moduleId required' }, 400)

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const userId = c.get('userId')

  const result = await query(
    `INSERT INTO features (project_id, module_id, name, slug, raw_description, ai_description, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [projectId, moduleId, name.trim(), slug, rawDescription ?? null, aiDescription ?? null, userId]
  )
  return c.json(result.rows[0], 201)
})

app.get('/', async (c) => {
  const moduleId = c.req.query('moduleId')
  const projectId = c.req.query('projectId') || 'default'

  if (moduleId) {
    const result = await query(
      `SELECT * FROM features WHERE module_id = $1 ORDER BY order_index, name`, [moduleId]
    )
    return c.json(result.rows)
  }

  const result = await query(
    `SELECT f.*, m.name as module_name, m.path as module_path FROM features f
     JOIN modules m ON m.id = f.module_id
     WHERE f.project_id = $1 ORDER BY m.path, f.order_index`, [projectId]
  )
  return c.json(result.rows)
})

app.get('/:id', async (c) => {
  const result = await query(`SELECT * FROM features WHERE id = $1`, [c.req.param('id')])
  if (!result.rows.length) return c.json({ error: 'not found' }, 404)
  return c.json(result.rows[0])
})

app.patch('/:id', async (c) => {
  const { name, rawDescription, aiDescription, status } = await c.req.json<{
    name?: string; rawDescription?: string; aiDescription?: string; status?: string
  }>()
  await query(
    `UPDATE features SET name = COALESCE($1, name), raw_description = COALESCE($2, raw_description),
     ai_description = COALESCE($3, ai_description), status = COALESCE($4, status), updated_at = NOW() WHERE id = $5`,
    [name ?? null, rawDescription ?? null, aiDescription ?? null, status ?? null, c.req.param('id')]
  )
  return c.json({ ok: true })
})

app.delete('/:id', async (c) => {
  await query(`DELETE FROM features WHERE id = $1`, [c.req.param('id')])
  return c.json({ ok: true })
})

export default app
