import { Hono } from 'hono'
import { query } from '../../db.ts'

const app = new Hono()

app.get('/', async (c) => {
  const result = await query(
    `SELECT id, name, slug, description, status, created_at, updated_at FROM projects ORDER BY updated_at DESC`
  )
  return c.json(result.rows)
})

app.post('/', async (c) => {
  const { name, description = '' } = await c.req.json<{ name: string; description?: string }>()
  if (!name?.trim()) return c.json({ error: 'name required' }, 400)

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const result = await query(
    `INSERT INTO projects (name, slug, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE SET name = $1, description = $3, updated_at = NOW()
     RETURNING id, name, slug, description, status, created_at`,
    [name.trim(), slug, description.trim()]
  )
  return c.json(result.rows[0], 201)
})

app.get('/:id', async (c) => {
  const id = c.req.param('id')
  const result = await query(
    `SELECT id, name, slug, description, status, created_at, updated_at FROM projects WHERE id = $1 OR slug = $1`,
    [id]
  )
  if (!result.rows.length) return c.json({ error: 'not found' }, 404)
  return c.json(result.rows[0])
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const { name, description } = await c.req.json<{ name?: string; description?: string }>()
  await query(
    `UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3`,
    [name ?? null, description ?? null, id]
  )
  return c.json({ ok: true })
})

export default app
