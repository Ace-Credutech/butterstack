import { Hono } from 'hono'
import { query } from '../../db.ts'

const app = new Hono()

app.get('/:projectId/members', async (c) => {
  const projectId = c.req.param('projectId')
  const result = await query(
    `SELECT pm.user_id, pm.role, pm.created_at, u.name, u.email
     FROM project_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1 ORDER BY pm.created_at`,
    [projectId]
  )
  return c.json(result.rows)
})

app.post('/:projectId/members', async (c) => {
  const projectId = c.req.param('projectId')
  const userId = c.get('userId')
  const { email, role = 'collaborator' } = await c.req.json<{ email: string; role?: string }>()

  if (!email?.trim()) return c.json({ error: 'email required' }, 400)
  if (!['admin', 'collaborator'].includes(role)) return c.json({ error: 'role must be admin or collaborator' }, 400)

  const isAdmin = await checkAdmin(projectId, userId)
  if (!isAdmin) return c.json({ error: 'only admins can add members' }, 403)

  const userResult = await query(`SELECT id, name, email FROM users WHERE email = $1`, [email.toLowerCase().trim()])
  if (!userResult.rows.length) return c.json({ error: 'user not found — they must register first' }, 404)

  const targetUser = userResult.rows[0]

  const existing = await query(
    `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, targetUser.id]
  )
  if (existing.rows.length) return c.json({ error: 'already a member' }, 409)

  await query(
    `INSERT INTO project_members (project_id, user_id, role, invited_by) VALUES ($1, $2, $3, $4)`,
    [projectId, targetUser.id, role, userId]
  )

  return c.json({ userId: targetUser.id, name: targetUser.name, email: targetUser.email, role }, 201)
})

app.patch('/:projectId/members/:memberId', async (c) => {
  const projectId = c.req.param('projectId')
  const memberId = c.req.param('memberId')
  const userId = c.get('userId')
  const { role } = await c.req.json<{ role: string }>()

  if (!['admin', 'collaborator'].includes(role)) return c.json({ error: 'role must be admin or collaborator' }, 400)

  const isAdmin = await checkAdmin(projectId, userId)
  if (!isAdmin) return c.json({ error: 'only admins can change roles' }, 403)

  await query(
    `UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3`,
    [role, projectId, memberId]
  )
  return c.json({ ok: true })
})

app.delete('/:projectId/members/:memberId', async (c) => {
  const projectId = c.req.param('projectId')
  const memberId = c.req.param('memberId')
  const userId = c.get('userId')

  const isAdmin = await checkAdmin(projectId, userId)
  if (!isAdmin) return c.json({ error: 'only admins can remove members' }, 403)

  if (Number(memberId) === userId) return c.json({ error: 'cannot remove yourself' }, 400)

  await query(`DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`, [projectId, memberId])
  return c.json({ ok: true })
})

async function checkAdmin(projectId: string, userId: number): Promise<boolean> {
  const r = await query(
    `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = 'admin'`,
    [projectId, userId]
  )
  return r.rows.length > 0
}

export default app
