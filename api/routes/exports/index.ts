import { Hono } from 'hono'
import { generateBrd } from '../../lib/brd-generator.ts'
import { generateExcelData, csvFromRows } from '../../lib/excel-generator.ts'
import { generateMindmapData, mindmapToHtml } from '../../lib/mindmap-generator.ts'

const app = new Hono()

app.get('/brd', async (c) => {
  const projectId = c.req.query('projectId')
  const moduleId = c.req.query('moduleId')
  const pageId = c.req.query('pageId')
  if (!projectId) return c.json({ error: 'projectId required' }, 400)

  const html = await generateBrd({
    projectId,
    moduleId: moduleId ? Number(moduleId) : undefined,
    pageId: pageId ? Number(pageId) : undefined,
  })

  return c.html(html)
})

app.get('/excel', async (c) => {
  const projectId = c.req.query('projectId')
  if (!projectId) return c.json({ error: 'projectId required' }, 400)

  const data = await generateExcelData({ projectId })

  const sheets = [
    { name: 'Modules', csv: csvFromRows(data.modules) },
    { name: 'Features', csv: csvFromRows(data.features) },
    { name: 'Pages', csv: csvFromRows(data.pages) },
    { name: 'Requirements', csv: csvFromRows(data.requirements) },
  ]

  const format = c.req.query('format') || 'csv'

  if (format === 'json') {
    return c.json(data)
  }

  const csv = sheets.map(s => `--- ${s.name} ---\n${s.csv}`).join('\n\n')
  c.header('Content-Type', 'text/csv')
  c.header('Content-Disposition', `attachment; filename="butterstack-export.csv"`)
  return c.body(csv)
})

app.get('/mindmap', async (c) => {
  const projectId = c.req.query('projectId')
  if (!projectId) return c.json({ error: 'projectId required' }, 400)

  const format = c.req.query('format') || 'html'
  const data = await generateMindmapData(projectId)

  if (format === 'json') return c.json(data)

  return c.html(mindmapToHtml(data))
})

export default app
