import { Hono }        from 'hono'
import { cors }        from 'hono/cors'
import { serveStatic } from 'hono/bun'

import { requireAuth }     from './middleware/auth.ts'
import auth                from './routes/auth/index.ts'
import prototypeGenerate   from './routes/prototype/generate.ts'
import prototypeRegenerate from './routes/prototype/regenerate.ts'
import requirementsCreate  from './routes/requirements/create.ts'
import projects            from './routes/projects/index.ts'
import projectMembers      from './routes/projects/members.ts'
import modulesCreate       from './routes/modules/create.ts'
import modulesAutoAssign   from './routes/modules/auto-assign.ts'
import modulesContent      from './routes/modules/content.ts'
import modulesParse        from './routes/modules/parse.ts'
import history             from './routes/history/index.ts'
import suggestions         from './routes/suggestions/index.ts'
import features            from './routes/features/index.ts'
import pages               from './routes/pages/index.ts'
import elicitation         from './routes/elicitation/index.ts'
import comments            from './routes/comments/index.ts'
import exports             from './routes/exports/index.ts'
import feedback            from './routes/feedback/index.ts'
import usage               from './routes/usage/index.ts'
import share               from './routes/share/index.ts'
import reprocess           from './routes/reprocess/index.ts'

const app = new Hono()

app.use('*', cors())

// ── API (/api/*) ──────────────────���───────────────────���────────────────────
const api = new Hono()

api.use('*', requireAuth)

api.get('/', (c) => c.json({ status: 'ok', service: 'butterstack-api' }))

api.route('/auth', auth)
api.route('/prototype/generate',   prototypeGenerate)
api.route('/prototype/regenerate', prototypeRegenerate)
api.route('/requirements/create',  requirementsCreate)

api.post('/requirements/preview', async (c) => {
  const { text = '' } = await c.req.json<{ text: string }>()
  if (!text.trim()) return c.json({ cleanPrompt: '' })
  const { streamlineInput } = await import('./lib/streamline.ts')
  const r = await streamlineInput(text, '')
  return c.json({ cleanPrompt: r.cleanPrompt })
})
api.route('/projects',             projects)
api.route('/projects',             projectMembers)
api.route('/modules',              modulesCreate)
api.route('/modules',              modulesAutoAssign)
api.route('/modules',              modulesContent)
api.route('/modules',              modulesParse)
api.route('/history',              history)
api.route('/suggestions',          suggestions)
api.route('/features',             features)
api.route('/pages',                pages)
api.route('/elicitation',          elicitation)
api.route('/comments',             comments)
api.route('/exports',              exports)
api.route('/feedback',             feedback)
api.route('/usage',                usage)
api.route('/share',                share)
api.route('/reprocess',            reprocess)

// Combined workspace init — single call instead of 3
api.get('/workspace/init', async (c) => {
  const { query: dbQuery } = await import('./db.ts')
  const projectId = c.req.query('projectId') || 'default'

  const [modulesRes, featuresRes, pagesRes, historyRes] = await Promise.all([
    dbQuery(
      `WITH RECURSIVE tree AS (
         SELECT id, name, slug, parent_id, depth, path, order_index, raw_title, raw_description, clean_prompt, tokens
         FROM modules WHERE project_id = $1 AND parent_id IS NULL
         UNION ALL
         SELECT m.id, m.name, m.slug, m.parent_id, m.depth, m.path, m.order_index, m.raw_title, m.raw_description, m.clean_prompt, m.tokens
         FROM modules m JOIN tree t ON m.parent_id = t.id
       ) SELECT * FROM tree ORDER BY path, order_index`, [projectId]
    ),
    dbQuery(`SELECT * FROM features WHERE project_id = $1 ORDER BY module_id, order_index`, [projectId]),
    dbQuery(`SELECT p.* FROM pages p WHERE p.project_id = $1 ORDER BY p.order_index, p.name`, [projectId]),
    dbQuery(`SELECT * FROM version_history WHERE project_id = $1 ORDER BY created_at DESC LIMIT 50`, [projectId]),
  ])

  const pageIds = pagesRes.rows.map((p: any) => p.id)
  let pageFeatures: any[] = []
  if (pageIds.length) {
    const pf = await dbQuery(
      `SELECT pf.page_id, f.id, f.name, m.name as module_name
       FROM page_features pf JOIN features f ON f.id = pf.feature_id JOIN modules m ON m.id = f.module_id
       WHERE pf.page_id = ANY($1::int[])`, [pageIds]
    )
    pageFeatures = pf.rows
  }

  return c.json({
    modules: modulesRes.rows,
    features: featuresRes.rows,
    pages: pagesRes.rows,
    pageFeatures,
    history: historyRes.rows,
  })
})

api.get('/users', async (c) => {
  const { query: dbQuery } = await import('./db.ts')
  const result = await dbQuery(`SELECT id, name, email, mobile, country_code, created_at FROM users ORDER BY name`)
  return c.json(result.rows)
})

api.get('/dictionary/stats', async (c) => {
  const { dictionaryStats } = await import('./lib/dictionary.ts')
  return c.json(dictionaryStats())
})

app.route('/api', api)

// ── Frontend (Angular static build) ──────────────────────��────────────────
// Serve built Angular app — run `cd web && ng build` first
app.use('/*', serveStatic({ root: '../web/dist/web/browser' }))

// SPA fallback — all unknown routes return index.html (Angular router handles them)
app.get('/*', async (c) => {
  const file = Bun.file('../web/dist/web/browser/index.html')
  const exists = await file.exists()
  if (!exists) return c.text('Run `cd web && ng build` to build the frontend first.', 404)
  return c.html(await file.text())
})

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
}
