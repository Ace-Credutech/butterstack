import { Hono }        from 'hono'
import { cors }        from 'hono/cors'
import { serveStatic } from 'hono/bun'

import prototypeGenerate   from './routes/prototype/generate.ts'
import prototypeRegenerate from './routes/prototype/regenerate.ts'
import requirementsCreate  from './routes/requirements/create.ts'
import projects            from './routes/projects/index.ts'
import modulesCreate       from './routes/modules/create.ts'
import modulesAutoAssign   from './routes/modules/auto-assign.ts'
import modulesContent      from './routes/modules/content.ts'
import modulesParse        from './routes/modules/parse.ts'
import history             from './routes/history/index.ts'
import suggestions         from './routes/suggestions/index.ts'

const app = new Hono()

app.use('*', cors())

// ── API (/api/*) ───────────────────────────────────────────────────────────
const api = new Hono()

api.get('/', (c) => c.json({ status: 'ok', service: 'butterstack-api' }))

api.route('/prototype/generate',   prototypeGenerate)
api.route('/prototype/regenerate', prototypeRegenerate)
api.route('/requirements/create',  requirementsCreate)
api.route('/projects',             projects)
api.route('/modules',              modulesCreate)
api.route('/modules',              modulesAutoAssign)
api.route('/modules',              modulesContent)
api.route('/modules',              modulesParse)
api.route('/history',              history)
api.route('/suggestions',          suggestions)

api.get('/dictionary/stats', async (c) => {
  const { dictionaryStats } = await import('./lib/dictionary.ts')
  return c.json(dictionaryStats())
})

app.route('/api', api)

// ── Frontend (Angular static build) ───────────────────────────────────────
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
