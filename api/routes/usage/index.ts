import { Hono } from 'hono'
import { query } from '../../db.ts'

const app = new Hono()

// Get usage summary for project
app.get('/', async (c) => {
  const projectId = c.req.query('projectId')
  if (!projectId) return c.json({ error: 'projectId required' }, 400)

  const summary = await query(
    `SELECT model, SUM(tokens_in) as total_in, SUM(tokens_out) as total_out,
            SUM(cost_usd) as total_cost, COUNT(*) as call_count
     FROM token_usage WHERE project_id = $1
     GROUP BY model ORDER BY total_cost DESC`,
    [projectId]
  )

  const total = await query(
    `SELECT SUM(tokens_in) as total_in, SUM(tokens_out) as total_out,
            SUM(cost_usd) as total_cost, COUNT(*) as call_count
     FROM token_usage WHERE project_id = $1`,
    [projectId]
  )

  const recent = await query(
    `SELECT model, tokens_in, tokens_out, cost_usd, endpoint, created_at
     FROM token_usage WHERE project_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [projectId]
  )

  return c.json({
    byModel: summary.rows,
    total: total.rows[0] || { total_in: 0, total_out: 0, total_cost: 0, call_count: 0 },
    recent: recent.rows,
  })
})

// Get usage by user
app.get('/by-user', async (c) => {
  const projectId = c.req.query('projectId')
  if (!projectId) return c.json({ error: 'projectId required' }, 400)

  const result = await query(
    `SELECT u.name, u.email, SUM(tu.tokens_in) as total_in, SUM(tu.tokens_out) as total_out,
            SUM(tu.cost_usd) as total_cost, COUNT(*) as call_count
     FROM token_usage tu JOIN users u ON u.id = tu.user_id
     WHERE tu.project_id = $1 GROUP BY u.id, u.name, u.email ORDER BY total_cost DESC`,
    [projectId]
  )
  return c.json(result.rows)
})

export default app
