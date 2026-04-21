import { Hono } from 'hono'
import { query } from '../../db.ts'

const app = new Hono()

app.get('/', async (c) => {
  const entityType = c.req.query('entityType')
  const entityId = c.req.query('entityId')
  if (!entityType || !entityId) return c.json([])
  const result = await query(
    `SELECT f.*, u.name as user_name FROM feedback f JOIN users u ON u.id = f.user_id
     WHERE f.entity_type = $1 AND f.entity_id = $2 ORDER BY f.created_at DESC`,
    [entityType, entityId]
  )
  return c.json(result.rows)
})

app.post('/', async (c) => {
  const { projectId, entityType, entityId, rating, content } = await c.req.json<{
    projectId: string; entityType: string; entityId: number; rating: string; content?: string
  }>()
  if (!rating) return c.json({ error: 'rating required' }, 400)
  const userId = c.get('userId')

  const existing = await query(
    `SELECT id FROM feedback WHERE entity_type = $1 AND entity_id = $2 AND user_id = $3`,
    [entityType, entityId, userId]
  )
  if (existing.rows.length) {
    await query(`UPDATE feedback SET rating = $1, content = $2 WHERE id = $3`, [rating, content ?? null, existing.rows[0].id])
    return c.json({ ok: true, updated: true })
  }

  await query(
    `INSERT INTO feedback (project_id, entity_type, entity_id, user_id, rating, content) VALUES ($1,$2,$3,$4,$5,$6)`,
    [projectId, entityType, entityId, userId, rating, content ?? null]
  )
  return c.json({ ok: true }, 201)
})

export default app
