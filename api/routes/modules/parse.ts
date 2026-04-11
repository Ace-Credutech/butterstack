// POST /modules/parse
// Algorithm step: raw text → module hierarchy → upsert into DB → return parsed tree
// Completely separate from prototype generation pipeline.
//
// Step 1 — Local parse: handles indented / bullet-point structured text (free, fast)
// Step 2 — AI parse:   fallback for natural-language input

import { Hono }           from 'hono'
import { query }          from '../../db.ts'
import { aiChat, MODELS } from '../../lib/ai-client.ts'

const app = new Hono()

interface ParsedNode { name: string; children: ParsedNode[] }

// Structural container labels that should be skipped (their children promoted up)
const SKIP = new Set(['modules', 'pages', 'fields', 'features', 'sub-modules', 'submodules', 'components', 'sections'])

// ── Step 1: local parser ─────────────────────────────────────────────────────
// Handles two formats:
//   Numbered:  "1 Partner Mgmt"  "1.1 Partner List"  "1.1.1 Details"
//   Indented:  "- Partner Mgmt"  "    - Partner List"

function parseLocal(text: string): ParsedNode[] | null {
  const lines = text.split('\n').filter(l => l.trim())

  // Detect numbered format (majority of lines start with digits)
  const numberedLines = lines.filter(l => /^\d+(\.\d+)*\s/.test(l.trim()))
  if (numberedLines.length >= Math.ceil(lines.length * 0.5)) {
    return parseNumbered(lines)
  }

  return parseIndented(lines)
}

function parseNumbered(lines: string[]): ParsedNode[] | null {
  const stack: { depth: number; node: ParsedNode }[] = []
  const roots: ParsedNode[] = []

  for (const line of lines) {
    const match = line.trim().match(/^(\d+(?:\.\d+)*)\s+(.+)$/)
    if (!match) continue
    const depth = match[1].split('.').length - 1
    const name  = match[2].trim()
    if (!name || SKIP.has(name.toLowerCase())) continue

    const node: ParsedNode = { name, children: [] }
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop()
    if (!stack.length) roots.push(node)
    else stack[stack.length - 1].node.children.push(node)
    stack.push({ depth, node })
  }

  return roots.length ? roots : null
}

function parseIndented(lines: string[]): ParsedNode[] | null {
  const stack: { indent: number; node: ParsedNode }[] = []
  const roots: ParsedNode[] = []

  for (const line of lines) {
    const indent = line.search(/\S/)
    const name   = line.trim().replace(/^[-*•]\s*/, '').trim()
    if (!name || SKIP.has(name.toLowerCase())) continue

    const node: ParsedNode = { name, children: [] }
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop()
    if (!stack.length) roots.push(node)
    else stack[stack.length - 1].node.children.push(node)
    stack.push({ indent, node })
  }

  return roots.length ? roots : null
}

// ── Step 2: AI parser ────────────────────────────────────────────────────────
async function parseWithAI(text: string): Promise<ParsedNode[]> {
  const res = await aiChat([{
    role: 'user',
    content: `Extract a module/feature hierarchy from this text.
Return JSON: {"modules":[{"name":"Module","children":[{"name":"Sub","children":[]}]}]}
Rules:
- Skip structural container labels: Modules, Pages, Fields, Features, Components, Sections
- Skip low-level data fields (Name, Email, Phone, etc.) — only include navigable features/modules
- Max 3 levels deep
- Clean, concise names (Title Case)

Text:\n${text}`,
  }], MODELS.streamline, true)

  const parsed = JSON.parse(res.text)
  return Array.isArray(parsed) ? parsed : (parsed.modules ?? [])
}

// ── Upsert one node (and recurse into children) ──────────────────────────────
async function upsertNode(
  node: ParsedNode,
  projectId: string,
  parentId: number | null,
  depth: number,
  parentPath: string,
): Promise<void> {
  const slug = node.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const path = parentPath ? `${parentPath}/${slug}` : slug

  // Look up by path (path is effectively unique per project)
  const byPath = await query(
    `SELECT id FROM modules WHERE project_id = $1 AND path = $2`,
    [projectId, path]
  )

  let id: number
  if (byPath.rows.length) {
    id = byPath.rows[0].id
    await query(`UPDATE modules SET name = $1 WHERE id = $2`, [node.name, id])
  } else {
    try {
      const res = await query(
        `INSERT INTO modules (project_id, name, slug, parent_id, depth, path)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [projectId, node.name, slug, parentId, depth, path]
      )
      id = res.rows[0].id
    } catch (e: any) {
      if (e.code === '23505') {
        // slug already exists under a different parent — use path as slug to disambiguate
        const res = await query(
          `INSERT INTO modules (project_id, name, slug, parent_id, depth, path)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [projectId, node.name, path.replace(/\//g, '--'), parentId, depth, path]
        )
        id = res.rows[0].id
      } else throw e
    }
  }

  for (const child of node.children ?? []) {
    await upsertNode(child, projectId, id, depth + 1, path)
  }
}

// ── Route ────────────────────────────────────────────────────────────────────
app.post('/parse', async (c) => {
  const { text, projectId = 'default' } = await c.req.json<{ text: string; projectId?: string }>()
  if (!text?.trim()) return c.json({ error: 'text required' }, 400)

  // Step 1 — try local, Step 2 — fall back to AI
  let parsed = parseLocal(text)
  const usedAI = !parsed
  if (!parsed) parsed = await parseWithAI(text)

  for (const node of parsed) {
    await upsertNode(node, projectId, null, 0, '')
  }

  return c.json({ ok: true, parsed, usedAI })
})

export default app
