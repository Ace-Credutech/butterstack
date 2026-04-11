// Unified AI client — swap provider and models via .env, zero code changes needed.
//
// .env keys:
//   AI_PROVIDER        = openai | anthropic          (default: openai)
//   MODEL_STREAMLINE   = model for prompt cleanup     (default: gpt-4o-mini / claude-haiku-4-5-20251001)
//   MODEL_TOKENS       = model for UI token extract   (default: gpt-4o-mini / claude-sonnet-4-6)
//   OPENAI_API_KEY     = sk-...
//   ANTHROPIC_API_KEY  = sk-ant-...

import OpenAI    from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const PROVIDER = (process.env.AI_PROVIDER ?? 'openai').toLowerCase()

const openai    = PROVIDER === 'openai'    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })       : null
const anthropic = PROVIDER === 'anthropic' ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null

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

// Single unified call — handles both providers transparently
export async function aiChat(messages: ChatMessage[], model: string, jsonMode = false): Promise<AIResponse> {
  if (PROVIDER === 'anthropic' && anthropic) {
    const system  = messages.find(m => m.role === 'system')?.content ?? ''
    const rest    = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    const jsonHint = jsonMode ? '\n\nRespond with valid JSON only.' : ''

    const res = await anthropic.messages.create({
      model,
      max_tokens: 1024,
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
  if (!openai) throw new Error('OpenAI client not initialized')

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
