import { query } from '../db.ts'
import { sha256 } from './hash.ts'
import { fuzzyLookup } from './fuzzy.ts'
import { learnFromTokens } from './dictionary.ts'
import { aiChat, MODELS } from './ai-client.ts'

const SYSTEM_PROMPT = `You are a UI token extractor. Given a product requirement, return a JSON object with these exact keys:
{
  "page_type": one of: dashboard | form | list | login | detail | landing | settings | empty,
  "layout": one of: sidebar-main | centered | full-page,
  "intent": short string describing the page's main purpose,
  "navigation": array of nav item strings,
  "sections": array of section name strings,
  "actions": array of action button label strings,
  "fields": array of {name, type} objects (type: text|number|email|password|select|date|textarea|checkbox),
  "stats": array of {label, value} objects for metrics/KPIs — use realistic numbers that make sense,
  "entity": main data entity name (singular),
  "search": boolean,
  "filters": boolean
}

IMPORTANT:
- Use EXACT field names/labels from the user's requirements. If user says "Captcha label should be Confirm You are Human", the field name MUST be "Confirm You are Human", NOT "Captcha".
- Pay close attention to any label, placeholder, or text customizations mentioned in the requirements.
- Stats should have realistic, consistent values (e.g., Active Users should be less than Total Users).
- Return only valid JSON. No explanation.`

async function callAI(prompt: string): Promise<UITokens> {
  const res = await aiChat(
    [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
    MODELS.tokens,
    true  // json mode
  )
  return JSON.parse(res.text) as UITokens
}

// Pure semantic tokens — what the UI means. Our system decides how to render.
export type UITokens = {
  page_type:   'dashboard' | 'form' | 'list' | 'login' | 'detail' | 'landing' | 'settings' | 'empty'
  layout:      'sidebar-main' | 'centered' | 'full-page'
  intent:      string
  navigation:  string[]
  sections:    string[]
  actions:     string[]
  fields:      { name: string; type: string }[]
  stats:       { label: string; value: string }[]
  entity:      string
  search:      boolean
  filters:     boolean
}

export type TokenResult = {
  tokens:       UITokens
  fromCache:    boolean
  source:       'cache' | 'fuzzy' | 'openai'
  fuzzyScore?:  number
  promptSent:   string
  responseRaw:  string
  tokensIn:     number
  tokensOut:    number
  model:        string
  durationMs:   number
}

export async function extractTokens(cleanPrompt: string): Promise<TokenResult> {
  const promptHash = sha256(cleanPrompt.toLowerCase().trim())

  // 1. Exact cache hit
  const cached = await query(
    `SELECT tokens FROM token_cache WHERE prompt_hash = $1 AND invalidated = FALSE`,
    [promptHash]
  )
  if (cached.rows.length) {
    await query(`UPDATE token_cache SET hit_count = hit_count + 1, last_hit_at = NOW() WHERE prompt_hash = $1`, [promptHash])
    return { tokens: cached.rows[0].tokens, fromCache: true, source: 'cache', promptSent: cleanPrompt, responseRaw: '', tokensIn: 0, tokensOut: 0, model: 'cache', durationMs: 0 }
  }

  // 2. Fuzzy cache hit (similar prompt already cached)
  const fuzzy = await fuzzyLookup(cleanPrompt)
  if (fuzzy) {
    return { tokens: fuzzy.tokens, fromCache: true, source: 'fuzzy', fuzzyScore: fuzzy.similarity, promptSent: cleanPrompt, responseRaw: '', tokensIn: 0, tokensOut: 0, model: 'cache', durationMs: 0 }
  }

  // 3. Direct OpenAI call (no batch delay)
  const start  = Date.now()
  const tokens = await callAI(cleanPrompt)

  // Persist to cache
  await query(
    `INSERT INTO token_cache (prompt_hash, clean_prompt, tokens)
     VALUES ($1, $2, $3)
     ON CONFLICT (prompt_hash) DO UPDATE SET tokens = $3, invalidated = FALSE, updated_at = NOW()`,
    [promptHash, cleanPrompt, JSON.stringify(tokens)]
  )

  // Teach local dictionary from extracted tokens (non-blocking)
  learnFromTokens(cleanPrompt, tokens as unknown as Record<string, unknown>)
    .catch(err => console.error('[dict learn tokens]', err.message))

  return {
    tokens,
    fromCache:   false,
    source:      'openai',
    promptSent:  cleanPrompt,
    responseRaw: JSON.stringify(tokens),
    tokensIn:    0,
    tokensOut:   0,
    model:       'gpt-4o-mini',
    durationMs:  Date.now() - start,
  }
}

export async function invalidateTokenCache(cleanPrompt: string): Promise<UITokens | null> {
  const promptHash = sha256(cleanPrompt.toLowerCase().trim())
  const existing   = await query(`SELECT tokens FROM token_cache WHERE prompt_hash = $1`, [promptHash])
  await query(`UPDATE token_cache SET invalidated = TRUE WHERE prompt_hash = $1`, [promptHash])
  return existing.rows[0]?.tokens ?? null
}

export async function updateTokenCache(
  cleanPrompt:  string,
  newTokens:    UITokens,
  oldTokens:    UITokens | null
): Promise<void> {
  const promptHash = sha256(cleanPrompt.toLowerCase().trim())
  await query(
    `INSERT INTO token_cache (prompt_hash, clean_prompt, tokens, previous_tokens, version)
     VALUES ($1,$2,$3,$4,1)
     ON CONFLICT (prompt_hash) DO UPDATE SET
       tokens          = $3,
       previous_tokens = $4,
       version         = token_cache.version + 1,
       invalidated     = FALSE,
       updated_at      = NOW()`,
    [promptHash, cleanPrompt, JSON.stringify(newTokens), oldTokens ? JSON.stringify(oldTokens) : null]
  )
}
