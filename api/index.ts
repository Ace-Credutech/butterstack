import { Hono } from 'hono'
import { cors }  from 'hono/cors'

import prototypeGenerate   from './routes/prototype/generate.ts'
import prototypeRegenerate from './routes/prototype/regenerate.ts'
import requirementsCreate  from './routes/requirements/create.ts'
import modulesCreate       from './routes/modules/create.ts'
import modulesAutoAssign   from './routes/modules/auto-assign.ts'
import suggestions         from './routes/suggestions/index.ts'

const app = new Hono()

app.use('*', cors())

app.get('/', (c) => c.json({ status: 'ok', service: 'butterstack-api' }))

// ── Prototype ─────────────────────────────────────────────────────────────────
app.route('/prototype/generate',   prototypeGenerate)
app.route('/prototype/regenerate', prototypeRegenerate)

// ── Requirements ──────────────────────────────────────────────────────────────
app.route('/requirements/create',  requirementsCreate)

// ── Modules (recursive tree) ──────────────────────────────────────────────────
app.route('/modules',              modulesCreate)
app.route('/modules',              modulesAutoAssign)

// ── Suggestions (autocomplete) ────────────────────────────────────────────────
app.route('/suggestions',          suggestions)

// ── Dictionary health (how smart is local processing?) ────────────────────────
app.get('/dictionary/stats', async (c) => {
  const { dictionaryStats } = await import('./lib/dictionary.ts')
  return c.json(dictionaryStats())
})

// ── Coming soon ───────────────────────────────────────────────────────────────
// app.route('/requirements/list',   requirementsList)
// app.route('/requirements/update', requirementsUpdate)
// app.route('/meetings/start',      meetingsStart)
// app.route('/meetings/end',        meetingsEnd)
// app.route('/auth/sign-in',        authSignIn)
// app.route('/project/tokens',      projectTokens)

export default {
  port: 3000,
  fetch: app.fetch,
}
