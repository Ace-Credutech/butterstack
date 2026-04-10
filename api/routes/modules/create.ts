import { Hono }  from 'hono'
import { query } from '../../db.ts'

const app = new Hono()

// Creates a module at any depth. Pass parentId to nest under an existing module.
// Path and depth are computed automatically from the parent chain.
app.post('/', async (c) => {
  const { name, projectId = 'default', parentId = null, orderIndex = 0 } =
    await c.req.json<{ name: string; projectId?: string; parentId?: number | null; orderIndex?: number }>()

  if (!name?.trim()) return c.json({ error: 'name required' }, 400)

  const slug  = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  // Resolve parent's path and depth to compute this node's values
  const { depth, path } = await resolveParentContext(parentId, slug)

  const result = await query(
    `INSERT INTO modules (project_id, name, slug, parent_id, depth, path, order_index)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, name, slug, parent_id, depth, path, order_index, created_at`,
    [projectId, name.trim(), slug, parentId, depth, path, orderIndex]
  )

  return c.json(result.rows[0], 201)
})

// Fetch full module tree (recursive CTE) for a project
app.get('/tree', async (c) => {
  const projectId = c.req.query('projectId') ?? 'default'

  const result = await query(
    `WITH RECURSIVE tree AS (
       SELECT id, name, slug, parent_id, depth, path, order_index
       FROM modules WHERE project_id = $1 AND parent_id IS NULL
       UNION ALL
       SELECT m.id, m.name, m.slug, m.parent_id, m.depth, m.path, m.order_index
       FROM modules m JOIN tree t ON m.parent_id = t.id
     )
     SELECT * FROM tree ORDER BY path, order_index`,
    [projectId]
  )

  return c.json(buildTree(result.rows))
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveParentContext(parentId: number | null, slug: string): Promise<{ depth: number; path: string }> {
  if (!parentId) return { depth: 0, path: slug }

  const parent = await query(`SELECT depth, path FROM modules WHERE id = $1`, [parentId])
  if (!parent.rows.length) return { depth: 0, path: slug }

  const p = parent.rows[0]
  return { depth: p.depth + 1, path: `${p.path}/${slug}` }
}

type Row = { id: number; name: string; slug: string; parent_id: number | null; depth: number; path: string; children?: Row[] }

function buildTree(rows: Row[]): Row[] {
  const map = new Map<number, Row>()
  const roots: Row[] = []

  for (const row of rows) { map.set(row.id, { ...row, children: [] }) }

  for (const row of map.values()) {
    if (row.parent_id === null) roots.push(row)
    else map.get(row.parent_id)?.children?.push(row)
  }

  return roots
}

export default app
