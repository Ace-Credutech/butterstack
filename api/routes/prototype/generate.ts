import { Hono }             from 'hono'
import { streamlineInput }  from '../../lib/streamline.ts'
import { extractTokens }    from '../../lib/openai.ts'
import { logOpenAI, logInternal } from '../../lib/logger.ts'

const app = new Hono()

app.post('/', async (c) => {
  const start = Date.now()
  const { title = '', description = '' } = await c.req.json<{ title: string; description: string }>()

  if (!title.trim() || !description.trim())
    return c.json({ error: 'both title and description required' }, 400)

  try {
    // Step 1 — Clean & normalize messy input → structured English prompt (cached)
    const streamlined = await streamlineInput(title, description)

    // Step 2 — Extract semantic tokens from clean prompt (cached)
    const tokenResult = await extractTokens(streamlined.cleanPrompt)

    // Step 3 — Log (non-blocking)
    if (!streamlined.fromCache) logOpenAI('/prototype/generate:streamline', streamlined)
    if (!tokenResult.fromCache) logOpenAI('/prototype/generate:tokens',     tokenResult)
    logInternal('/prototype/generate', { title, description }, { source: tokenResult.source }, Date.now() - start)

    // Step 4 — Return tokens only. Frontend owns rendering.
    return c.json({
      tokens:      tokenResult.tokens,
      cleanPrompt: streamlined.cleanPrompt,
      source:      tokenResult.source,
      cached:      tokenResult.fromCache,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logInternal('/prototype/generate', { title, description }, { error: message }, Date.now() - start, 'error', message)
    return c.json({ error: 'generation failed', detail: message }, 500)
  }
})

export default app
