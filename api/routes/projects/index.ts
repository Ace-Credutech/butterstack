import { Hono } from 'hono'
import { query } from '../../db.ts'
import { getDesignSystem, updateDesignSystem } from '../../lib/project-tokens.ts'

const app = new Hono()

app.get('/', async (c) => {
  const userId = c.get('userId')
  const result = await query(
    `SELECT p.id, p.name, p.slug, p.description, p.status, p.created_at, p.updated_at, pm.role
     FROM projects p JOIN project_members pm ON pm.project_id = p.id
     WHERE pm.user_id = $1 ORDER BY p.updated_at DESC`,
    [userId]
  )
  return c.json(result.rows)
})

app.post('/', async (c) => {
  const { name, description = '' } = await c.req.json<{ name: string; description?: string }>()
  if (!name?.trim()) return c.json({ error: 'name required' }, 400)

  const userId = c.get('userId')
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const result = await query(
    `INSERT INTO projects (name, slug, description, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (slug) DO UPDATE SET name = $1, description = $3, updated_at = NOW()
     RETURNING id, name, slug, description, status, created_at`,
    [name.trim(), slug, description.trim(), userId]
  )
  const project = result.rows[0]

  await query(
    `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'admin') ON CONFLICT DO NOTHING`,
    [project.id, userId]
  )

  return c.json(project, 201)
})

app.get('/:id', async (c) => {
  const id  = c.req.param('id')
  const num = parseInt(id)
  const result = isNaN(num)
    ? await query(`SELECT id, name, slug, description, status, created_at, updated_at FROM projects WHERE slug = $1`, [id])
    : await query(`SELECT id, name, slug, description, status, created_at, updated_at FROM projects WHERE id = $1 OR slug = $2`, [num, id])
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

app.get('/:id/design-system', async (c) => {
  const ds = await getDesignSystem(c.req.param('id'))
  return c.json(ds)
})

app.patch('/:id/design-system', async (c) => {
  const body = await c.req.json()
  await updateDesignSystem(c.req.param('id'), body)
  return c.json({ ok: true })
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')

  const memberCheck = await query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`, [id, userId]
  )
  if (!memberCheck.rows.length || memberCheck.rows[0].role !== 'admin') {
    return c.json({ error: 'only admins can delete projects' }, 403)
  }

  await query(`DELETE FROM page_features WHERE page_id IN (SELECT id FROM pages WHERE project_id = $1)`, [id])
  await query(`DELETE FROM pages WHERE project_id = $1`, [id])
  await query(`DELETE FROM features WHERE project_id = $1`, [id])
  await query(`DELETE FROM elicitation_messages WHERE session_id IN (SELECT id FROM elicitation_sessions WHERE project_id = $1)`, [id])
  await query(`DELETE FROM elicitation_sessions WHERE project_id = $1`, [id])
  await query(`DELETE FROM version_history WHERE project_id = $1`, [id])
  await query(`DELETE FROM requirements WHERE project_id = $1`, [id])
  await query(`DELETE FROM modules WHERE project_id = $1`, [id])
  await query(`DELETE FROM project_invitations WHERE project_id = $1`, [id])
  await query(`DELETE FROM project_members WHERE project_id = $1`, [id])
  await query(`DELETE FROM projects WHERE id = $1`, [id])

  return c.json({ ok: true })
})

export default app
