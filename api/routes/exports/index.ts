import { Hono } from 'hono'
import { generateBrd } from '../../lib/brd-generator.ts'
import { generateExcel, generateExcelData } from '../../lib/excel-generator.ts'
import { generateMindmapData, mindmapToHtml } from '../../lib/mindmap-generator.ts'

const app = new Hono()

app.get('/brd', async (c) => {
  const projectId = c.req.query('projectId')
  if (!projectId) return c.json({ error: 'projectId required' }, 400)

  const html = await generateBrd({
    projectId,
    moduleId: c.req.query('moduleId') ? Number(c.req.query('moduleId')) : undefined,
    pageId: c.req.query('pageId') ? Number(c.req.query('pageId')) : undefined,
    featureId: c.req.query('featureId') ? Number(c.req.query('featureId')) : undefined,
  })
  return c.html(html)
})

app.get('/excel', async (c) => {
  const projectId = c.req.query('projectId')
  if (!projectId) return c.json({ error: 'projectId required' }, 400)

  const opts = {
    projectId,
    moduleId: c.req.query('moduleId') ? Number(c.req.query('moduleId')) : undefined,
    featureId: c.req.query('featureId') ? Number(c.req.query('featureId')) : undefined,
    pageId: c.req.query('pageId') ? Number(c.req.query('pageId')) : undefined,
  }

  const format = c.req.query('format') || 'xlsx'

  if (format === 'json') {
    return c.json(await generateExcelData(opts))
  }

  const buffer = await generateExcel(opts)
  c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  c.header('Content-Disposition', 'attachment; filename="butterstack-export.xlsx"')
  return c.body(buffer)
})

app.get('/mindmap', async (c) => {
  const projectId = c.req.query('projectId')
  if (!projectId) return c.json({ error: 'projectId required' }, 400)

  const moduleId = c.req.query('moduleId') ? Number(c.req.query('moduleId')) : undefined
  const format = c.req.query('format') || 'html'
  const data = await generateMindmapData(projectId, moduleId)

  if (format === 'json') return c.json(data)
  return c.html(mindmapToHtml(data))
})

export default app
