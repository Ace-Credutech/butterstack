import { query } from '../db.ts'

interface BrdOptions {
  projectId: string
  moduleId?: number
  pageId?: number
  featureId?: number
}

export async function generateBrd(opts: BrdOptions): Promise<string> {
  const project = await query(`SELECT name, description FROM projects WHERE id = $1`, [opts.projectId])
  const projectName = project.rows[0]?.name || 'Project'
  const projectDesc = project.rows[0]?.description || ''

  let moduleFilter = ''
  const params: unknown[] = [opts.projectId]

  if (opts.moduleId) {
    moduleFilter = ` AND (m.id = $2 OR m.parent_id = $2)`
    params.push(opts.moduleId)
  }

  const modules = await query(
    `WITH RECURSIVE tree AS (
       SELECT id, name, slug, parent_id, depth, path FROM modules WHERE project_id = $1 AND parent_id IS NULL ${opts.moduleId ? 'AND id = $2' : ''}
       UNION ALL
       SELECT m.id, m.name, m.slug, m.parent_id, m.depth, m.path FROM modules m JOIN tree t ON m.parent_id = t.id
     ) SELECT * FROM tree ORDER BY path`,
    params
  )

  let featQuery = `SELECT f.*, m.name as module_name, m.path as module_path
     FROM features f JOIN modules m ON m.id = f.module_id
     WHERE f.project_id = $1`
  const featParams: unknown[] = [opts.projectId]
  if (opts.featureId) {
    featQuery += ` AND f.id = $${featParams.length + 1}`
    featParams.push(opts.featureId)
  } else if (opts.moduleId) {
    const moduleIds = modules.rows.map(m => m.id)
    if (moduleIds.length) {
      featQuery += ` AND f.module_id = ANY($${featParams.length + 1}::int[])`
      featParams.push(moduleIds)
    }
  }
  featQuery += ` ORDER BY m.path, f.order_index`
  const features = await query(featQuery, featParams)

  let pages
  if (opts.pageId) {
    pages = await query(
      `SELECT p.*, COALESCE(
         (SELECT json_agg(json_build_object('name', f.name)) FROM page_features pf JOIN features f ON f.id = pf.feature_id WHERE pf.page_id = p.id), '[]'
       ) as linked_features FROM pages p WHERE p.id = $1`, [opts.pageId]
    )
  } else {
    pages = await query(
      `SELECT p.*, COALESCE(
         (SELECT json_agg(json_build_object('name', f.name)) FROM page_features pf JOIN features f ON f.id = pf.feature_id WHERE pf.page_id = p.id), '[]'
       ) as linked_features FROM pages p WHERE p.project_id = $1 ORDER BY p.order_index`, [opts.projectId]
    )
  }

  const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BRD — ${projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print { .no-print { display: none; } body { font-size: 12px; } }
    body { font-family: 'Inter', system-ui, sans-serif; }
  </style>
</head>
<body class="bg-white max-w-4xl mx-auto px-12 py-10">

  <div class="border-b-2 border-green-600 pb-6 mb-8">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
        <span class="text-white font-bold text-lg">+</span>
      </div>
      <span class="text-xl font-bold text-gray-900">butterstack</span>
    </div>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Business Requirements Document</h1>
    <h2 class="text-xl text-green-700 font-semibold">${projectName}</h2>
    <p class="text-sm text-gray-400 mt-2">Generated: ${now}</p>
    ${projectDesc ? `<p class="text-sm text-gray-600 mt-3">${projectDesc}</p>` : ''}
  </div>

  <div class="mb-8">
    <h2 class="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Table of Contents</h2>
    <ol class="list-decimal list-inside text-sm text-gray-600 space-y-1">
      <li>Project Overview</li>
      <li>Module Breakdown</li>
      <li>Feature Specifications</li>
      <li>Page Specifications</li>
    </ol>
  </div>`

  // Section 1: Overview
  html += `
  <div class="mb-10">
    <h2 class="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">1. Project Overview</h2>
    <table class="w-full text-sm">
      <tr class="border-b"><td class="py-2 text-gray-500 w-40">Project</td><td class="py-2 font-medium">${projectName}</td></tr>
      <tr class="border-b"><td class="py-2 text-gray-500">Modules</td><td class="py-2 font-medium">${modules.rows.filter(m => m.depth === 0).length}</td></tr>
      <tr class="border-b"><td class="py-2 text-gray-500">Features</td><td class="py-2 font-medium">${features.rows.length}</td></tr>
      <tr class="border-b"><td class="py-2 text-gray-500">Pages</td><td class="py-2 font-medium">${pages.rows.length}</td></tr>
    </table>
  </div>`

  // Section 2: Modules
  html += `
  <div class="mb-10">
    <h2 class="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">2. Module Breakdown</h2>`

  for (const mod of modules.rows.filter(m => m.depth === 0)) {
    html += `<div class="mb-4 ml-${mod.depth * 4}">
      <h3 class="text-base font-semibold text-gray-800">${mod.name}</h3>`
    const children = modules.rows.filter(m => m.parent_id === mod.id)
    for (const child of children) {
      html += `<div class="ml-6 mt-2"><h4 class="text-sm font-medium text-gray-700">${child.name}</h4>`
      const childFeats = features.rows.filter(f => f.module_id === child.id)
      if (childFeats.length) {
        html += `<ul class="ml-4 mt-1 text-sm text-gray-500">`
        for (const f of childFeats) html += `<li class="py-0.5">• ${f.name}</li>`
        html += `</ul>`
      }
      html += `</div>`
    }
    html += `</div>`
  }
  html += `</div>`

  // Section 3: Features
  html += `
  <div class="mb-10">
    <h2 class="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">3. Feature Specifications</h2>`

  for (const feat of features.rows) {
    html += `
    <div class="mb-8 border border-gray-100 rounded-lg p-5">
      <div class="flex items-center gap-2 mb-3">
        <h3 class="text-base font-semibold text-gray-900">${feat.name}</h3>
        <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">${feat.module_name}</span>
        <span class="text-xs px-2 py-0.5 rounded ${feat.status === 'draft' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}">${feat.status}</span>
      </div>
      ${feat.summary ? `<p class="text-sm text-gray-600 mb-3 italic">${feat.summary}</p>` : ''}
      ${feat.ai_description ? `<div class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">${feat.ai_description}</div>` : '<p class="text-sm text-gray-400 italic">Documentation pending...</p>'}
      ${feat.test_cases ? `<div class="mt-4 pt-3 border-t border-gray-100"><h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Test Cases</h4><div class="text-sm text-gray-600 whitespace-pre-wrap">${feat.test_cases}</div></div>` : ''}
      ${feat.use_cases ? `<div class="mt-4 pt-3 border-t border-gray-100"><h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Use Cases</h4><div class="text-sm text-gray-600 whitespace-pre-wrap">${feat.use_cases}</div></div>` : ''}
    </div>`
  }
  html += `</div>`

  // Section 4: Pages
  html += `
  <div class="mb-10">
    <h2 class="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">4. Page Specifications</h2>`

  for (const page of pages.rows) {
    const linked = Array.isArray(page.linked_features) ? page.linked_features : []
    html += `
    <div class="mb-6 border border-gray-100 rounded-lg p-5">
      <div class="flex items-center gap-2 mb-2">
        <h3 class="text-base font-semibold text-gray-900">${page.name}</h3>
        <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">${page.page_type || 'page'}</span>
      </div>
      ${linked.length ? `<p class="text-xs text-gray-400 mb-2">Linked features: ${linked.map((f: any) => f.name).join(', ')}</p>` : ''}
      ${page.ai_description ? `<div class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">${page.ai_description}</div>` : '<p class="text-sm text-gray-400 italic">Documentation pending...</p>'}
    </div>`
  }
  html += `</div>`

  html += `
  <div class="border-t border-gray-200 pt-6 mt-10 text-center text-xs text-gray-300">
    <p>Generated by Butterstack — ${now}</p>
  </div>
</body></html>`

  return html
}
