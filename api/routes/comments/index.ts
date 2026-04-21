import { Hono } from 'hono'
import { query } from '../../db.ts'

const app = new Hono()

app.get('/', async (c) => {
  const entityType = c.req.query('entityType')
  const entityId = c.req.query('entityId')
  const projectId = c.req.query('projectId')

  if (entityType && entityId) {
    const result = await query(
      `SELECT c.*, u.name as user_name, u.email as user_email
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.entity_type = $1 AND c.entity_id = $2 ORDER BY c.created_at`,
      [entityType, entityId]
    )
    return c.json(result.rows)
  }

  if (projectId) {
    const result = await query(
      `SELECT c.entity_type, c.entity_id, COUNT(*) as count
       FROM comments c WHERE c.project_id = $1 AND c.resolved = FALSE
       GROUP BY c.entity_type, c.entity_id`,
      [projectId]
    )
    return c.json(result.rows)
  }

  return c.json([])
})

app.post('/', async (c) => {
  const { projectId, entityType, entityId, content } = await c.req.json<{
    projectId: string; entityType: string; entityId: number; content: string
  }>()
  if (!content?.trim()) return c.json({ error: 'content required' }, 400)

  const userId = c.get('userId')
  const result = await query(
    `INSERT INTO comments (project_id, entity_type, entity_id, user_id, content) VALUES ($1,$2,$3,$4,$5)
     RETURNING id, created_at`,
    [projectId, entityType, entityId, userId, content.trim()]
  )
  return c.json(result.rows[0], 201)
})

app.patch('/:id/resolve', async (c) => {
  const id = c.req.param('id')
  await query(`UPDATE comments SET resolved = NOT resolved WHERE id = $1`, [id])
  return c.json({ ok: true })
})

app.delete('/:id', async (c) => {
  const userId = c.get('userId')
  await query(`DELETE FROM comments WHERE id = $1 AND user_id = $2`, [c.req.param('id'), userId])
  return c.json({ ok: true })
})

export default app
