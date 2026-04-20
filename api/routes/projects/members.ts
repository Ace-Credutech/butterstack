import { Hono } from 'hono'
import { query } from '../../db.ts'
import { sendEmail } from '../../services/send-email.ts'

const app = new Hono()
const BASE_URL = process.env.APP_URL || 'http://localhost:4200'

app.get('/:projectId/members', async (c) => {
  const projectId = c.req.param('projectId')
  const result = await query(
    `SELECT pm.user_id, pm.role, pm.created_at, u.name, u.email
     FROM project_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1 ORDER BY pm.created_at`,
    [projectId]
  )
  const pending = await query(
    `SELECT email, role, created_at FROM project_invitations WHERE project_id = $1 AND status = 'pending' AND expires_at > NOW()`,
    [projectId]
  )
  return c.json({ members: result.rows, pending: pending.rows })
})

app.post('/:projectId/members', async (c) => {
  const projectId = c.req.param('projectId')
  const userId = c.get('userId')
  const { email, role = 'collaborator' } = await c.req.json<{ email: string; role?: string }>()

  if (!email?.trim()) return c.json({ error: 'email required' }, 400)
  if (!['admin', 'collaborator'].includes(role)) return c.json({ error: 'role must be admin or collaborator' }, 400)

  const isAdmin = await checkAdmin(projectId, userId)
  if (!isAdmin) return c.json({ error: 'only admins can add members' }, 403)

  const cleanEmail = email.toLowerCase().trim()

  const userResult = await query(`SELECT id, name, email FROM users WHERE email = $1`, [cleanEmail])

  if (userResult.rows.length) {
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
    return c.json({ userId: targetUser.id, name: targetUser.name, email: targetUser.email, role, status: 'added' }, 201)
  }

  const existingInvite = await query(
    `SELECT 1 FROM project_invitations WHERE project_id = $1 AND email = $2 AND status = 'pending' AND expires_at > NOW()`,
    [projectId, cleanEmail]
  )
  if (existingInvite.rows.length) return c.json({ error: 'invitation already sent' }, 409)

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

  const projectResult = await query(`SELECT name FROM projects WHERE id = $1`, [projectId])
  const projectName = projectResult.rows[0]?.name || 'a project'

  const inviterResult = await query(`SELECT name FROM users WHERE id = $1`, [userId])
  const inviterName = inviterResult.rows[0]?.name || 'Someone'

  await query(
    `INSERT INTO project_invitations (project_id, email, role, token, invited_by) VALUES ($1, $2, $3, $4, $5)`,
    [projectId, cleanEmail, role, token, userId]
  )

  const inviteUrl = `${BASE_URL}/register?invite=${token}`

  sendEmail({
    to: cleanEmail,
    subject: `${inviterName} invited you to "${projectName}" on Butterstack`,
    html: inviteEmailHtml(inviterName, projectName, inviteUrl),
    userId,
  }).catch(() => {})

  return c.json({ email: cleanEmail, role, status: 'invited' }, 201)
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

function inviteEmailHtml(inviterName: string, projectName: string, url: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
      <div style="margin-bottom:24px">
        <div style="display:inline-flex;align-items:center;gap:8px">
          <div style="width:28px;height:28px;background:#16a34a;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-weight:bold;font-size:14px">+</span>
          </div>
          <span style="font-weight:bold;color:#111;font-size:16px">butterstack</span>
        </div>
      </div>
      <h2 style="color:#111;font-size:20px;margin-bottom:8px">You're invited!</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin-bottom:24px">
        <strong>${inviterName}</strong> has invited you to collaborate on <strong>"${projectName}"</strong> on Butterstack.
      </p>
      <a href="${url}" style="display:inline-block;padding:12px 28px;background:#16a34a;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
        Accept Invitation
      </a>
      <p style="color:#999;font-size:12px;margin-top:32px;line-height:1.5">
        This invitation expires in 7 days.<br/>
        If you didn't expect this, you can ignore this email.
      </p>
    </div>
  `
}

export default app
