import OpenAI from 'openai'
import { query } from '../db.ts'
import { sha256 } from './hash.ts'
import { localStreamline } from './local-streamline.ts'
import { learnFromStreamline } from './dictionary.ts'

const openai             = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const LOCAL_CONFIDENCE   = 0.75   // above this: skip OpenAI, use local result

const SYSTEM_PROMPT = `
Convert the user's UI requirement (may be Hinglish, Marathi-English, Gujarati-English, or English) into a single clean English sentence describing exactly what UI feature they want.
Return ONLY the clean sentence. No explanation.
`.trim()

export type StreamlineResult = {
  cleanPrompt: string
  fromCache:   boolean
  source:      'cache' | 'local' | 'openai'
  tokensIn:    number
  tokensOut:   number
  model:       string
  durationMs:  number
}

export async function streamlineInput(title: string, description: string): Promise<StreamlineResult> {
  const rawHash = sha256(`${title.trim().toLowerCase()}|${description.trim().toLowerCase()}`)

  // Check cache first
  const cached = await query(
    `SELECT clean_prompt FROM prompt_cache WHERE raw_hash = $1 AND invalidated = FALSE`,
    [rawHash]
  )
  if (cached.rows.length) {
    await query(`UPDATE prompt_cache SET hit_count = hit_count + 1, last_hit_at = NOW() WHERE raw_hash = $1`, [rawHash])
    return { cleanPrompt: cached.rows[0].clean_prompt, fromCache: true, source: 'cache', tokensIn: 0, tokensOut: 0, model: 'cache', durationMs: 0 }
  }

  // Try local normalization first (zero API cost)
  const local = await localStreamline(title, description)
  if (local.confidence >= LOCAL_CONFIDENCE) {
    await query(
      `INSERT INTO prompt_cache (raw_hash, raw_title, raw_description, clean_prompt)
       VALUES ($1,$2,$3,$4) ON CONFLICT (raw_hash) DO NOTHING`,
      [rawHash, title, description, local.cleanPrompt]
    )
    return { cleanPrompt: local.cleanPrompt, fromCache: false, source: 'local', tokensIn: 0, tokensOut: 0, model: 'local', durationMs: 0 }
  }

  // Low confidence — call OpenAI for proper cleanup
  const userMsg = `Title: "${title}"\nDescription: "${description}"`
  const start   = Date.now()

  const response = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    messages:    [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMsg }],
    temperature: 0.1,
    max_tokens:  150,
  })

  const cleanPrompt = response.choices[0]?.message?.content?.trim() ?? local.cleanPrompt
  const usage       = response.usage

  await query(
    `INSERT INTO prompt_cache (raw_hash, raw_title, raw_description, clean_prompt)
     VALUES ($1,$2,$3,$4) ON CONFLICT (raw_hash) DO NOTHING`,
    [rawHash, title, description, cleanPrompt]
  )

  // Teach the local dictionary from this AI response (non-blocking)
  learnFromStreamline(`${title} ${description}`, cleanPrompt)
    .catch(err => console.error('[dict learn]', err.message))

  return {
    cleanPrompt,
    fromCache:  false,
    source:     'openai',
    tokensIn:   usage?.prompt_tokens     ?? 0,
    tokensOut:  usage?.completion_tokens ?? 0,
    model:      response.model,
    durationMs: Date.now() - start,
  }
}

export async function invalidateStreamlineCache(title: string, description: string): Promise<void> {
  const rawHash = sha256(`${title.trim().toLowerCase()}|${description.trim().toLowerCase()}`)
  await query(`UPDATE prompt_cache SET invalidated = TRUE WHERE raw_hash = $1`, [rawHash])
}
