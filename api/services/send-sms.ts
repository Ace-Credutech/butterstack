import { query } from '../db.ts'

const BREVO_KEY = process.env.BREVO_API_KEY || ''
const BREVO_URL = 'https://api.brevo.com/v3/transactionalSMS/sms'
const SENDER_NAME = process.env.BREVO_SMS_SENDER || 'Btrstack'

interface SmsOptions {
  to: string
  content: string
  userId?: number
}

export async function sendSms(opts: SmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const logId = await logComm(opts.userId, opts.to, opts.content)

  if (!BREVO_KEY) {
    console.warn('[sms] BREVO_API_KEY not set — skipping send to', opts.to)
    await updateLog(logId, 'skipped', 'no api key')
    return { success: false, error: 'no api key' }
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: SENDER_NAME,
        recipient: opts.to,
        content: opts.content,
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

export function welcomeSmsContent(name: string): string {
  return `Welcome to Butterstack, ${name}! Your account is ready.`
}

async function logComm(userId: number | undefined, toAddr: string, body: string): Promise<number> {
  const r = await query(
    `INSERT INTO communication_logs (type, user_id, to_address, subject, body_preview, status) VALUES ('sms',$1,$2,'SMS',$3,'pending') RETURNING id`,
    [userId ?? null, toAddr, body.slice(0, 500)]
  )
  return r.rows[0].id
}

async function updateLog(id: number, status: string, providerResponse: string) {
  await query(`UPDATE communication_logs SET status=$1, provider_response=$2, updated_at=NOW() WHERE id=$3`, [status, providerResponse, id])
}
