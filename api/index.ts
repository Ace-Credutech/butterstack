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
