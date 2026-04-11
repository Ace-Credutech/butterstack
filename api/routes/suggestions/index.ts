// GET /suggestions?q=text&type=title|description
// Returns top 5 suggestions from prompt_cache based on similarity
import { Hono } from 'hono'
import { query } from '../../db.ts'

const app = new Hono()

app.get('/', async (c) => {
  const q = c.req.query('q')?.trim() ?? ''
  if (q.length < 2) return c.json({ suggestions: [] })

  // Search raw_title and raw_description for similar patterns
  const result = await query(
    `SELECT DISTINCT raw_title, raw_description, clean_prompt,
            similarity(raw_title || ' ' || coalesce(raw_description, ''), $1) AS sim
     FROM prompt_cache
     WHERE raw_title IS NOT NULL
       AND (raw_title ILIKE $2 OR raw_description ILIKE $2
            OR similarity(raw_title || ' ' || coalesce(raw_description,''), $1) > 0.2)
     ORDER BY sim DESC
     LIMIT 5`,
    [q, `%${q}%`]
  )

  return c.json({ suggestions: result.rows })
})

app.post('/learn', async (c) => {
  // When user types something different from suggestion → store as new learning
  const { original, chosen, context } = await c.req.json()
  // For now just log it — future: store in a patterns table
  console.log('[suggestion learn]', { original, chosen, context })
  return c.json({ ok: true })
})

export default app
