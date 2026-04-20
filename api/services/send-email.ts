import { query } from '../db.ts'

const BREVO_KEY = process.env.BREVO_API_KEY || ''
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'
const SENDER = { name: 'Butterstack', email: process.env.BREVO_SENDER_EMAIL || 'noreply@butterstack.dev' }

interface EmailOptions {
  to: string
  toName?: string
  subject: string
  html: string
  userId?: number
}

export async function sendEmail(opts: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const logId = await logComm('email', opts.userId, opts.to, opts.subject, opts.html.slice(0, 500))

  if (!BREVO_KEY) {
    console.warn('[email] BREVO_API_KEY not set — skipping send to', opts.to)
    await updateLog(logId, 'skipped', 'no api key')
    return { success: false, error: 'no api key' }
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: opts.to, name: opts.toName || opts.to }],
        subject: opts.subject,
        htmlContent: opts.html,
      }),
    })

    const data = await res.json() as Record<string, unknown>
    if (!res.ok) {
      await updateLog(logId, 'failed', JSON.stringify(data))
      return { success: false, error: String(data.message || res.statusText) }
    }

    await updateLog(logId, 'sent', JSON.stringify(data))
    return { success: true, messageId: String(data.messageId || '') }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await updateLog(logId, 'error', msg)
    return { success: false, error: msg }
  }
}

export function welcomeEmailHtml(name: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#215732">Welcome to Butterstack, ${name}!</h2>
      <p>Your account is ready. Start building your next project now.</p>
      <p style="color:#666;font-size:13px">— The Butterstack Team</p>
    </div>
  `
}

async function logComm(type: string, userId: number | undefined, toAddr: string, subject: string, bodyPreview: string): Promise<number> {
  const r = await query(
    `INSERT INTO communication_logs (type, user_id, to_address, subject, body_preview, status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING id`,
    [type, userId ?? null, toAddr, subject, bodyPreview]
  )
  return r.rows[0].id
}

async function updateLog(id: number, status: string, providerResponse: string) {
  await query(`UPDATE communication_logs SET status=$1, provider_response=$2, updated_at=NOW() WHERE id=$3`, [status, providerResponse, id])
}
