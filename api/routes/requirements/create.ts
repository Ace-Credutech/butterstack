import { Hono }               from 'hono'
import { streamlineInput }    from '../../lib/streamline.ts'
import { extractTokens }      from '../../lib/openai.ts'
import { query }              from '../../db.ts'
import { logInternal }        from '../../lib/logger.ts'

const app = new Hono()

app.post('/', async (c) => {
  const start = Date.now()
  const { title = '', description = '', projectId = 'default', moduleId = null, createdBy = 'BA' } =
    await c.req.json<{ title: string; description?: string; projectId?: string; moduleId?: number | null; createdBy?: string }>()

  if (!title.trim()) return c.json({ error: 'title required' }, 400)

  // Step 1 — Auto-detect module if not provided
  const resolvedModuleId = moduleId ?? await inferModule(title, description, projectId)

  // Step 2 — Streamline + extract tokens (cached — near-zero cost if seen before)
  const streamlined = await streamlineInput(title, description ?? '')
  const tokenResult = await extractTokens(streamlined.cleanPrompt)

  // Step 3 — Store requirement in DB
  const result = await query(
    `INSERT INTO requirements (project_id, module_id, title, description, clean_prompt, tokens, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, module_id, status, version, created_at`,
    [projectId, resolvedModuleId, title, description ?? null, streamlined.cleanPrompt, JSON.stringify(tokenResult.tokens), createdBy]
  )

  const req = result.rows[0]

  logInternal('/requirements/create', { title, description, projectId, moduleId }, { id: req.id, moduleId: req.module_id }, Date.now() - start)

  return c.json({
    id:          req.id,
    moduleId:    req.module_id,
    status:      req.status,
    version:     req.version,
    cleanPrompt: streamlined.cleanPrompt,
    tokens:      tokenResult.tokens,
    createdAt:   req.created_at,
  }, 201)
})

// Infer module from title/description using existing modules in the project
async function inferModule(title: string, description: string, projectId: string): Promise<number | null> {
  const modules = await query(
    `SELECT id, name, slug FROM modules WHERE project_id = $1 ORDER BY order_index`,
    [projectId]
  )
  if (!modules.rows.length) return null

  const text = `${title} ${description}`.toLowerCase()
  for (const mod of modules.rows) {
    if (text.includes(mod.name.toLowerCase()) || text.includes(mod.slug.toLowerCase()))
      return mod.id
  }
  return null   // no match — stays unassigned
}

export default app
