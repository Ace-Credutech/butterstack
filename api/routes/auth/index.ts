import { Hono } from 'hono'
import { query } from '../../db.ts'
import { hashPassword, verifyPassword, signToken } from '../../lib/auth.ts'
import { sendEmail, welcomeEmailHtml } from '../../services/send-email.ts'
import { sendSms, welcomeSmsContent } from '../../services/send-sms.ts'
import { requireAuth } from '../../middleware/auth.ts'

const app = new Hono()

app.post('/register', async (c) => {
  const { name, email, password, mobile, countryCode, inviteToken } = await c.req.json<{
    name: string; email: string; password: string; mobile: string; countryCode: string; inviteToken?: string
  }>()

  if (!name?.trim() || !email?.trim() || !password || !mobile?.trim() || !countryCode?.trim()) {
    return c.json({ error: 'name, email, password, mobile, countryCode required' }, 400)
  }

  const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()])
  if (existing.rows.length) {
    return c.json({ error: 'email already registered' }, 409)
  }

  const hash = await hashPassword(password)
  const dialDigits = countryCode.replace(/\D/g, '')
  let cleanMobile = mobile.replace(/\D/g, '')
  if (dialDigits && cleanMobile.startsWith(dialDigits)) {
    cleanMobile = cleanMobile.slice(dialDigits.length)
  }
  const fullMobile = `${countryCode}${cleanMobile}`

  const result = await query(
    `INSERT INTO users (name, email, password_hash, mobile, country_code)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, mobile, country_code, created_at`,
    [name.trim(), email.toLowerCase().trim(), hash, fullMobile, countryCode.trim()]
  )
  const user = result.rows[0]

  const token = await signToken({ sub: String(user.id), email: user.email, name: user.name })

  sendEmail({ to: user.email, toName: user.name, subject: 'Welcome to Butterstack!', html: welcomeEmailHtml(user.name), userId: user.id }).catch(() => {})
  sendSms({ to: fullMobile, content: welcomeSmsContent(user.name), userId: user.id }).catch(() => {})

  let redirectProjectId: number | null = null

  if (inviteToken) {
    const inv = await query(
      `SELECT id, project_id, role FROM project_invitations WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
      [inviteToken]
    )
    if (inv.rows.length) {
      const invite = inv.rows[0]
      await query(
        `INSERT INTO project_members (project_id, user_id, role, invited_by) VALUES ($1, $2, $3, (SELECT invited_by FROM project_invitations WHERE id = $4)) ON CONFLICT DO NOTHING`,
        [invite.project_id, user.id, invite.role, invite.id]
      )
      await query(`UPDATE project_invitations SET status = 'accepted' WHERE id = $1`, [invite.id])
      redirectProjectId = invite.project_id
    }
  }

  return c.json({ user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, countryCode: user.country_code }, token, redirectProjectId }, 201)
})

app.post('/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>()

  if (!email?.trim() || !password) {
    return c.json({ error: 'email and password required' }, 400)
  }

  const result = await query(
    `SELECT id, name, email, password_hash, mobile, country_code FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  )
  if (!result.rows.length) {
    return c.json({ error: 'invalid credentials' }, 401)
  }

  const user = result.rows[0]
  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return c.json({ error: 'invalid credentials' }, 401)
  }

  const token = await signToken({ sub: String(user.id), email: user.email, name: user.name })

  return c.json({ user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, countryCode: user.country_code }, token })
})

app.get('/invite/:token', async (c) => {
  const token = c.req.param('token')
  const result = await query(
    `SELECT pi.email, pi.role, p.name as project_name
     FROM project_invitations pi JOIN projects p ON p.id = pi.project_id
     WHERE pi.token = $1 AND pi.status = 'pending' AND pi.expires_at > NOW()`,
    [token]
  )
  if (!result.rows.length) return c.json({ error: 'invalid or expired invitation' }, 404)
  const inv = result.rows[0]
  return c.json({ email: inv.email, projectName: inv.project_name, role: inv.role })
})

app.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId')
  const result = await query(
    `SELECT id, name, email, mobile, country_code, api_keys, created_at FROM users WHERE id = $1`,
    [userId]
  )
  if (!result.rows.length) return c.json({ error: 'not found' }, 404)
  const u = result.rows[0]
  return c.json({ id: u.id, name: u.name, email: u.email, mobile: u.mobile, countryCode: u.country_code, createdAt: u.created_at, apiKeys: u.api_keys || {} })
})

app.get('/me/api-keys', requireAuth, async (c) => {
  const userId = c.get('userId')
  const result = await query(`SELECT api_keys FROM users WHERE id = $1`, [userId])
  const keys = result.rows[0]?.api_keys || {}
  const masked: Record<string, string> = {}
  for (const [k, v] of Object.entries(keys)) {
    const val = String(v)
    masked[k] = val.length > 8 ? val.slice(0, 4) + '...' + val.slice(-4) : '****'
  }
  return c.json(masked)
})

app.patch('/me/api-keys', requireAuth, async (c) => {
  const userId = c.get('userId')
  const keys = await c.req.json<Record<string, string>>()
  const current = (await query(`SELECT api_keys FROM users WHERE id = $1`, [userId])).rows[0]?.api_keys || {}
  const merged = { ...current, ...keys }
  for (const [k, v] of Object.entries(merged)) { if (!v) delete merged[k] }
  await query(`UPDATE users SET api_keys = $1 WHERE id = $2`, [JSON.stringify(merged), userId])
  return c.json({ ok: true })
})

export default app
