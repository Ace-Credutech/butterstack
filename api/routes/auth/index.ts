import { Hono } from 'hono'
import { query } from '../../db.ts'
import { hashPassword, verifyPassword, signToken } from '../../lib/auth.ts'
import { sendEmail, welcomeEmailHtml } from '../../services/send-email.ts'
import { sendSms, welcomeSmsContent } from '../../services/send-sms.ts'
import { requireAuth } from '../../middleware/auth.ts'

const app = new Hono()

app.post('/register', async (c) => {
  const { name, email, password, mobile, countryCode } = await c.req.json<{
    name: string; email: string; password: string; mobile: string; countryCode: string
  }>()

  if (!name?.trim() || !email?.trim() || !password || !mobile?.trim() || !countryCode?.trim()) {
    return c.json({ error: 'name, email, password, mobile, countryCode required' }, 400)
  }

  const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()])
  if (existing.rows.length) {
    return c.json({ error: 'email already registered' }, 409)
  }

  const hash = await hashPassword(password)
  const fullMobile = `${countryCode}${mobile.replace(/\D/g, '')}`

  const result = await query(
    `INSERT INTO users (name, email, password_hash, mobile, country_code)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, mobile, country_code, created_at`,
    [name.trim(), email.toLowerCase().trim(), hash, fullMobile, countryCode.trim()]
  )
  const user = result.rows[0]

  const token = await signToken({ sub: String(user.id), email: user.email, name: user.name })

  sendEmail({ to: user.email, toName: user.name, subject: 'Welcome to Butterstack!', html: welcomeEmailHtml(user.name), userId: user.id }).catch(() => {})
  sendSms({ to: fullMobile, content: welcomeSmsContent(user.name), userId: user.id }).catch(() => {})

  return c.json({ user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, countryCode: user.country_code }, token }, 201)
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

app.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId')
  const result = await query(
    `SELECT id, name, email, mobile, country_code, created_at FROM users WHERE id = $1`,
    [userId]
  )
  if (!result.rows.length) return c.json({ error: 'not found' }, 404)
  const u = result.rows[0]
  return c.json({ id: u.id, name: u.name, email: u.email, mobile: u.mobile, countryCode: u.country_code, createdAt: u.created_at })
})

export default app
