import { Hono }                                    from 'hono'
import { invalidateStreamlineCache, streamlineInput } from '../../lib/streamline.ts'
import { invalidateTokenCache, extractTokens, updateTokenCache } from '../../lib/openai.ts'
import { diffTokens }                                from '../../lib/diff.ts'
import { logInternal }                               from '../../lib/logger.ts'
import { query }                                     from '../../db.ts'

const app = new Hono()

app.post('/', async (c) => {
  const start = Date.now()
  const { title = '', description = '', feedback = '' } =
    await c.req.json<{ title: string; description: string; feedback?: string }>()

  if (!title.trim() && !description.trim())
    return c.json({ error: 'title or description required' }, 400)

  // Step 1 — Get old cleanPrompt (before invalidating) so we can retrieve old tokens
  const originalStreamlined = await streamlineInput(title, description)
  const oldTokens           = await invalidateTokenCache(originalStreamlined.cleanPrompt)

  // Step 2 — Invalidate prompt cache, then re-streamline with feedback appended
  await invalidateStreamlineCache(title, description)
  const augmentedDescription = feedback ? `${description}. User feedback: ${feedback}` : description
  const streamlined          = await streamlineInput(title, augmentedDescription)

  // Step 3 — Force fresh token extraction (cache was just invalidated)
  const tokenResult = await extractTokens(streamlined.cleanPrompt)

  // Step 4 — Diff old vs new, update cache with version bump
  const diff = oldTokens ? diffTokens(oldTokens, tokenResult.tokens) : null
  await updateTokenCache(streamlined.cleanPrompt, tokenResult.tokens, oldTokens)

  // Step 5 — Log regeneration with feedback
  await query(
    `INSERT INTO regeneration_log (raw_hash, prompt_hash, feedback, old_tokens, new_tokens)
     VALUES ($1, $2, $3, $4, $5)`,
    [null, null, feedback || null, oldTokens ? JSON.stringify(oldTokens) : null, JSON.stringify(tokenResult.tokens)]
  ).catch(() => {})

  logInternal('/prototype/regenerate', { title, description, feedback }, { diff }, Date.now() - start)

  // Frontend owns rendering — return tokens + diff only
  return c.json({
    tokens:      tokenResult.tokens,
    cleanPrompt: streamlined.cleanPrompt,
    diff,
    version:     'fresh',
    feedback:    feedback || null,
  })
})

export default app
