// Unified AI client — swap provider and models via .env, zero code changes needed.
// Per-user API keys: if user has their own key, use it. Otherwise fallback to .env.
//
// .env keys:
//   AI_PROVIDER        = openai | anthropic          (default: openai)
//   MODEL_STREAMLINE   = model for prompt cleanup     (default: gpt-4o-mini / claude-haiku-4-5-20251001)
//   MODEL_TOKENS       = model for UI token extract   (default: gpt-4o-mini / claude-sonnet-4-6)
//   OPENAI_API_KEY     = sk-...
//   ANTHROPIC_API_KEY  = sk-ant-...

import OpenAI    from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { query } from '../db.ts'

const PROVIDER = (process.env.AI_PROVIDER ?? 'openai').toLowerCase()

// Default clients from .env
const defaultOpenai    = process.env.OPENAI_API_KEY    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })       : null
const defaultAnthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null

// Default models per provider
const DEFAULTS = {
  openai:    { streamline: 'gpt-4o-mini',              tokens: 'gpt-4o-mini' },
  anthropic: { streamline: 'claude-haiku-4-5-20251001', tokens: 'claude-sonnet-4-6' },
}

export const MODELS = {
  streamline: process.env.MODEL_STREAMLINE ?? DEFAULTS[PROVIDER as keyof typeof DEFAULTS]?.streamline ?? 'gpt-4o-mini',
  tokens:     process.env.MODEL_TOKENS     ?? DEFAULTS[PROVIDER as keyof typeof DEFAULTS]?.tokens     ?? 'gpt-4o-mini',
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type AIResponse = {
  text:      string
  tokensIn:  number
  tokensOut: number
  model:     string
}

async function getUserKeys(userId?: number): Promise<{ openaiKey?: string; anthropicKey?: string } | null> {
  if (!userId) return null
  try {
    const result = await query(`SELECT api_keys FROM users WHERE id = $1`, [userId])
    const keys = result.rows[0]?.api_keys
    if (!keys) return null
    return { openaiKey: keys.openai_key, anthropicKey: keys.anthropic_key }
  } catch { return null }
}

function getClients(userId?: number, userKeys?: { openaiKey?: string; anthropicKey?: string } | null) {
  const provider = PROVIDER

  if (userKeys?.openaiKey && provider === 'openai') {
    return { provider: 'openai' as const, openai: new OpenAI({ apiKey: userKeys.openaiKey }), anthropic: null }
  }
  if (userKeys?.anthropicKey && provider === 'anthropic') {
    return { provider: 'anthropic' as const, openai: null, anthropic: new Anthropic({ apiKey: userKeys.anthropicKey }) }
  }
  // Also allow user to use a different provider than default
  if (userKeys?.anthropicKey && !userKeys?.openaiKey) {
    return { provider: 'anthropic' as const, openai: null, anthropic: new Anthropic({ apiKey: userKeys.anthropicKey }) }
  }
  if (userKeys?.openaiKey && !userKeys?.anthropicKey) {
    return { provider: 'openai' as const, openai: new OpenAI({ apiKey: userKeys.openaiKey }), anthropic: null }
  }

  return { provider: PROVIDER as 'openai' | 'anthropic', openai: defaultOpenai, anthropic: defaultAnthropic }
}

// Single unified call — handles both providers transparently
// Pass userId to use per-user API keys if available
export async function aiChat(messages: ChatMessage[], model: string, jsonMode = false, maxTokens = 1024, userId?: number): Promise<AIResponse> {
  const userKeys = await getUserKeys(userId)
  const { provider, openai, anthropic } = getClients(userId, userKeys)

  if (provider === 'anthropic' && anthropic) {
    const system  = messages.find(m => m.role === 'system')?.content ?? ''
    const rest    = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    const jsonHint = jsonMode ? '\n\nRespond with valid JSON only.' : ''

    const res = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system:     system + jsonHint,
      messages:   rest,
    })

    const text = res.content[0].type === 'text' ? res.content[0].text : ''
    return {
      text,
      tokensIn:  res.usage.input_tokens,
      tokensOut: res.usage.output_tokens,
      model:     res.model,
    }
  }

  // OpenAI (default)
  if (!openai) throw new Error('No AI client available — add API key in settings or .env')

  const res = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.1,
    ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
  })

  const text = res.choices[0].message.content ?? ''
  return {
    text,
    tokensIn:  res.usage?.prompt_tokens     ?? 0,
    tokensOut: res.usage?.completion_tokens ?? 0,
    model:     res.model,
  }
}

export { PROVIDER }
