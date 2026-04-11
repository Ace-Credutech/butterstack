// Module content — each module owns its user input + AI-generated documentation.
// POST /modules/:id/content  — save input, generate tokens, store in module
// GET  /modules/:id/content  — fetch module with full content

import { Hono }              from 'hono'
import { query }             from '../../db.ts'
import { streamlineInput }   from '../../lib/streamline.ts'
import { extractTokens }     from '../../lib/openai.ts'

const app = new Hono()

// Save user input → generate AI docs → store in module
app.post('/:id/content', async (c) => {
  const id    = parseInt(c.req.param('id'))
  const { title, description } = await c.req.json<{ title: string; description: string }>()

  if (!title?.trim()) return c.json({ error: 'title required' }, 400)

  // Check module exists
  const mod = await query(`SELECT id, name FROM modules WHERE id = $1`, [id])
  if (!mod.rows.length) return c.json({ error: 'module not found' }, 404)

  // Streamline → tokens
  const streamlined = await streamlineInput(title, description ?? '')
  const tokenResult = await extractTokens(streamlined.cleanPrompt)

  await query(
    `UPDATE modules SET
       raw_title          = $1,
       raw_description    = $2,
       clean_prompt       = $3,
       tokens             = $4,
       tokens_version     = COALESCE(tokens_version, 0) + 1,
       content_updated_at = NOW()
     WHERE id = $5`,
    [title.trim(), description?.trim() ?? '', streamlined.cleanPrompt, JSON.stringify(tokenResult.tokens), id]
  )

  return c.json({
    moduleId:    id,
    cleanPrompt: streamlined.cleanPrompt,
    tokens:      tokenResult.tokens,
    source:      tokenResult.source,
    cached:      tokenResult.fromCache,
  })
})

// Fetch module with full content
app.get('/:id/content', async (c) => {
  const id = parseInt(c.req.param('id'))
  const result = await query(
    `SELECT id, name, slug, path, depth, parent_id,
            raw_title, raw_description, clean_prompt, tokens, tokens_version, content_updated_at
     FROM modules WHERE id = $1`,
    [id]
  )
  if (!result.rows.length) return c.json({ error: 'module not found' }, 404)
  return c.json(result.rows[0])
})

export default app
