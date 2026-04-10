// Batch token extraction — accumulates requests, flushes to OpenAI in one call.
// Up to BATCH_SIZE requests OR FLUSH_MS ms, whichever comes first.

import OpenAI from 'openai'
import { query } from '../db.ts'
import { sha256 } from './hash.ts'
import type { UITokens } from './openai.ts'

const openai      = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const BATCH_SIZE  = 5
const FLUSH_MS    = 1500

type BatchEntry = {
  prompt:  string
  resolve: (tokens: UITokens) => void
  reject:  (err: Error) => void
}

let queue: BatchEntry[] = []
let timer: ReturnType<typeof setTimeout> | null = null

export function queueTokenExtraction(cleanPrompt: string): Promise<UITokens> {
  return new Promise((resolve, reject) => {
    queue.push({ prompt: cleanPrompt, resolve, reject })
    if (queue.length >= BATCH_SIZE) flush()
    else if (!timer) timer = setTimeout(flush, FLUSH_MS)
  })
}

async function flush(): Promise<void> {
  if (timer)  { clearTimeout(timer); timer = null }
  if (!queue.length) return

  const batch = queue.splice(0, BATCH_SIZE)

  const batchPrompt = batch
    .map((e, i) => `Requirement ${i + 1}: ${e.prompt}`)
    .join('\n---\n')

  const systemPrompt = `
You are a UI semantic analyser. Given ${batch.length} requirements, return a JSON object with an "items" array of exactly ${batch.length} token objects — one per requirement, in the same order.

Return format:
{
  "items": [
    {
      "page_type":  "dashboard"|"form"|"list"|"login"|"detail"|"landing"|"settings"|"empty",
      "layout":     "sidebar-main"|"centered"|"full-page",
      "intent":     string,
      "navigation": string[],
      "sections":   string[],
      "actions":    string[],
      "fields":     [{ "name": string, "type": "text"|"email"|"password"|"textarea"|"select"|"date"|"number" }],
      "stats":      [{ "label": string, "value": string }],
      "entity":     string,
      "search":     boolean,
      "filters":    boolean
    }
  ]
}
Return ONLY valid JSON. No explanation.
`.trim()

  try {
    const start    = Date.now()
    const response = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: batchPrompt },
      ],
      temperature:     0.1,
      max_tokens:      400 * batch.length,
      response_format: { type: 'json_object' },
    })

    const raw    = response.choices[0]?.message?.content ?? '{"items":[]}'
    const parsed = JSON.parse(raw)

    // Normalise: { items: [...] } or bare array or { "0": {...}, "1": {...} }
    let results: UITokens[]
    if (Array.isArray(parsed))              results = parsed
    else if (Array.isArray(parsed.items))   results = parsed.items
    else                                    results = Object.values(parsed) as UITokens[]

    console.log(`[batch] flushed ${batch.length} items, got ${results.length} results`)
    const duration = Date.now() - start

    // Cache each result and resolve each promise
    await Promise.all(batch.map(async (entry, i) => {
      const tokens = results[i]
      if (!tokens) {
        console.error(`[batch] missing result for item ${i}, raw:`, raw)
        entry.reject(new Error(`OpenAI returned no token object for item ${i}`))
        return
      }

      const hash = sha256(entry.prompt.toLowerCase().trim())
      await query(
        `INSERT INTO token_cache (prompt_hash, clean_prompt, tokens)
         VALUES ($1, $2, $3) ON CONFLICT (prompt_hash) DO NOTHING`,
        [hash, entry.prompt, JSON.stringify(tokens)]
      ).catch(() => {})

      entry.resolve(tokens)
    }))

    // Single log entry for the whole batch
    await query(
      `INSERT INTO openai_logs (endpoint, model, prompt_sent, response_raw, tokens_in, tokens_out, tokens_total, duration_ms, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        `/prototype/batch-tokens (${batch.length} items)`,
        response.model,
        batchPrompt,
        raw,
        response.usage?.prompt_tokens ?? 0,
        response.usage?.completion_tokens ?? 0,
        response.usage?.total_tokens ?? 0,
        duration,
        'success',
      ]
    ).catch(() => {})

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    batch.forEach(e => e.reject(error))
  }
}
