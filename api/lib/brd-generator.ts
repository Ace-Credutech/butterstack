import { query } from '../db.ts'

function mdToHtml(md: string): string {
  if (!md) return ''
  return md
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-semibold text-gray-800 mt-4 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold text-gray-900 mt-5 mb-2 border-b border-gray-100 pb-1">$1</h3>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm text-gray-600 py-0.5">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 text-sm text-gray-600 py-0.5"><span class="font-medium">$1.</span> $2</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br/><br/>')
}

function renderNumberedSections(
  aiDesc: string,
  parentNum: string,
  h: (num: string, title: string, level: number) => string
): string {
  const parts = aiDesc.split(/^## /m).filter(Boolean)
  let result = ''
  parts.forEach((part, i) => {
    const newline = part.indexOf('\n')
    if (newline === -1) return
    const title = part.slice(0, newline).trim()
    const content = part.slice(newline + 1).trim()
    const sNum = `${parentNum}.${i + 1}`
    result += h(sNum, title, 2)
    // Number the list items within each section
    const lines = content.split('\n')
    let itemCount = 0
    const rendered = lines.map(line => {
      const trimmed = line.trim()
      if (!trimmed) return '<br/>'
      if (trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed)) {
        itemCount++
        const text = trimmed.replace(/^[-\d.]+\s*/, '')
        return `<p class="text-sm text-gray-600 py-0.5 ml-4">${sNum}.${itemCount} ${text}</p>`
      }
      return `<p class="text-sm text-gray-700 leading-relaxed">${trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`
    }).join('')
    result += rendered
  })
  // If no ## sections found, render as plain
  if (!parts.length || (parts.length === 1 && !aiDesc.includes('## '))) {
    result = `<div class="text-sm text-gray-700 leading-relaxed mb-3">${mdToHtml(aiDesc)}</div>`
  }
  return result
}

interface BrdOptions {
  projectId: string
  moduleId?: number
  pageId?: number
  featureId?: number
}

interface TocEntry { num: string; title: string; level: number }

export async function generateBrd(opts: BrdOptions): Promise<string> {
  const project = await query(
    `SELECT p.name, p.description, p.created_at, p.updated_at, u.name as author_name
     FROM projects p LEFT JOIN users u ON u.id = p.created_by WHERE p.id = $1`, [opts.projectId]
  )
  const projectName = project.rows[0]?.name || 'Project'
  const projectDesc = project.rows[0]?.description || ''
  const authorName = project.rows[0]?.author_name || 'Team'
  const createdAt = project.rows[0]?.created_at ? new Date(project.rows[0].created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : ''
  const updatedAt = project.rows[0]?.updated_at ? new Date(project.rows[0].updated_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : ''

  const members = await query(
    `SELECT u.name, pm.role FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = $1 ORDER BY pm.created_at`, [opts.projectId]
  )
  const reviewers = members.rows.filter((m: any) => m.role === 'admin').map((m: any) => m.name).join(', ') || authorName

  const params: unknown[] = [opts.projectId]
  const modules = await query(
    `WITH RECURSIVE tree AS (
       SELECT id, name, slug, parent_id, depth, path FROM modules WHERE project_id = $1 AND parent_id IS NULL ${opts.moduleId ? 'AND id = $2' : ''}
       UNION ALL
       SELECT m.id, m.name, m.slug, m.parent_id, m.depth, m.path FROM modules m JOIN tree t ON m.parent_id = t.id
     ) SELECT * FROM tree ORDER BY path`,
    opts.moduleId ? [opts.projectId, opts.moduleId] : [opts.projectId]
  )

  let featWhere = `f.project_id = $1`
  const featParams: unknown[] = [opts.projectId]
  if (opts.featureId) { featWhere += ` AND f.id = $2`; featParams.push(opts.featureId) }
  else if (opts.moduleId) { const ids = modules.rows.map(m => m.id); if (ids.length) { featWhere += ` AND f.module_id = ANY($2::int[])`; featParams.push(ids) } }
  const features = await query(`SELECT f.*, m.name as module_name, m.path as module_path FROM features f JOIN modules m ON m.id = f.module_id WHERE ${featWhere} ORDER BY m.path, f.order_index`, featParams)

  let pages
  if (opts.pageId) {
    pages = await query(`SELECT p.*, COALESCE((SELECT json_agg(json_build_object('name', f.name)) FROM page_features pf JOIN features f ON f.id = pf.feature_id WHERE pf.page_id = p.id), '[]') as linked_features FROM pages p WHERE p.id = $1`, [opts.pageId])
  } else {
    pages = await query(`SELECT p.*, COALESCE((SELECT json_agg(json_build_object('name', f.name)) FROM page_features pf JOIN features f ON f.id = pf.feature_id WHERE pf.page_id = p.id), '[]') as linked_features FROM pages p WHERE p.project_id = $1 ORDER BY p.order_index`, [opts.projectId])
  }

  const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  const scopeLabel = opts.featureId ? 'Feature' : opts.pageId ? 'Page' : opts.moduleId ? 'Module' : 'Project'
  const isFullScope = !opts.featureId && !opts.pageId

  // Build TOC entries and body simultaneously
  const toc: TocEntry[] = []
  let body = ''

  const h = (num: string, title: string, level: number) => {
    toc.push({ num, title, level })
    const sizes = ['text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm']
    const weights = ['font-bold', 'font-bold', 'font-semibold', 'font-medium', 'font-medium']
    const sz = sizes[Math.min(level, 4)]
    const wt = weights[Math.min(level, 4)]
    const border = level <= 1 ? 'border-b border-gray-200 pb-2' : ''
    return `<h${level + 2} class="${sz} ${wt} text-gray-900 ${border} mb-3 mt-8" id="s-${num.replace(/\./g, '-')}">${num} ${title}</h${level + 2}>`
  }

  // 1. Introduction
  body += h('1', 'Introduction', 0)
  body += `<p class="text-sm text-gray-700 leading-relaxed mb-3">${projectDesc || `${projectName} is a digital platform designed to streamline and automate key business operations. This Business Requirements Document outlines the functional and non-functional requirements, module structure, feature specifications, and page definitions for the project.`}</p>`
  body += `<p class="text-sm text-gray-700 leading-relaxed">This document serves as the primary reference for the product team and the development team to understand what needs to be built and how it should function.</p>`

  // 2. Objective
  body += h('2', 'Objective', 0)
  body += `<p class="text-sm text-gray-700 mb-2">The primary objectives of ${projectName} are to:</p>
  <ul class="text-sm text-gray-700 space-y-1 ml-4 mb-4">
    <li>• Define and document all functional requirements across ${modules.rows.filter(m => m.depth === 0).length} modules</li>
    <li>• Specify ${features.rows.length} features with detailed acceptance criteria and business rules</li>
    <li>• Map ${pages.rows.length} user-facing pages with associated features</li>
    <li>• Ensure traceability and stakeholder alignment throughout the lifecycle</li>
  </ul>`

  if (isFullScope) {
    // 3. Project Overview
    body += h('3', `${scopeLabel} Overview`, 0)
    body += `<table class="w-full text-sm mb-4">
      <tr class="border-b"><td class="py-2 text-gray-500 w-40">${scopeLabel}</td><td class="py-2 font-medium">${projectName}</td></tr>
      <tr class="border-b"><td class="py-2 text-gray-500">Modules</td><td class="py-2 font-medium">${modules.rows.filter(m => m.depth === 0).length}</td></tr>
      <tr class="border-b"><td class="py-2 text-gray-500">Sub-Modules</td><td class="py-2 font-medium">${modules.rows.filter(m => m.depth > 0).length}</td></tr>
      <tr class="border-b"><td class="py-2 text-gray-500">Features</td><td class="py-2 font-medium">${features.rows.length}</td></tr>
      <tr class="border-b"><td class="py-2 text-gray-500">Pages</td><td class="py-2 font-medium">${pages.rows.length}</td></tr>
    </table>`

    // 4. Module Breakdown with hierarchical numbering
    body += h('4', 'Module Breakdown', 0)
    const rootModules = modules.rows.filter(m => m.depth === 0)
    rootModules.forEach((mod, mi) => {
      const modNum = `4.${mi + 1}`
      body += h(modNum, mod.name, 1)

      const children = modules.rows.filter(m => m.parent_id === mod.id)
      children.forEach((child, ci) => {
        const childNum = `${modNum}.${ci + 1}`
        body += h(childNum, child.name, 2)

        const childFeats = features.rows.filter(f => f.module_id === child.id)
        if (childFeats.length) {
          body += `<ul class="ml-4 text-sm text-gray-600 mb-2">`
          childFeats.forEach((f, fi) => {
            body += `<li class="py-0.5">${childNum}.${fi + 1} ${f.name}</li>`
          })
          body += `</ul>`
        }
      })

      // Features directly under root module
      const directFeats = features.rows.filter(f => f.module_id === mod.id)
      if (directFeats.length) {
        body += `<ul class="ml-4 text-sm text-gray-600 mb-2">`
        directFeats.forEach((f, fi) => {
          body += `<li class="py-0.5">${modNum}.${children.length + fi + 1} ${f.name}</li>`
        })
        body += `</ul>`
      }
    })

    // 5. Feature Specifications
    body += h('5', 'Feature Specifications', 0)
  } else {
    body += h('3', 'Feature Specifications', 0)
  }

  const featSectionNum = isFullScope ? '5' : '3'
  features.rows.forEach((feat, fi) => {
    const fNum = `${featSectionNum}.${fi + 1}`
    body += h(fNum, feat.name, 1)
    body += `<div class="flex items-center gap-2 mb-3">
      <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">${feat.module_name}</span>
      <span class="text-xs px-2 py-0.5 rounded ${feat.status === 'draft' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}">${feat.status}</span>
    </div>`
    if (feat.summary) body += `<p class="text-sm text-gray-600 mb-3 italic">${feat.summary}</p>`
    if (feat.ai_description) {
      body += renderNumberedSections(feat.ai_description, fNum, h)
    } else {
      body += `<p class="text-sm text-gray-400 italic">Documentation pending...</p>`
    }

    // Count existing sub-sections from ai_description
    const existingSections = (feat.ai_description || '').split(/^## /m).filter(Boolean).length

    if (feat.test_cases) {
      body += h(`${fNum}.${existingSections + 1}`, 'Test Cases', 2)
      body += `<div class="text-sm text-gray-600 leading-relaxed">${mdToHtml(feat.test_cases)}</div>`
    }
    if (feat.use_cases) {
      const tcOffset = feat.test_cases ? 1 : 0
      body += h(`${fNum}.${existingSections + 1 + tcOffset}`, 'Use Cases', 2)
      body += `<div class="text-sm text-gray-600 leading-relaxed">${mdToHtml(feat.use_cases)}</div>`
    }
  })

  // Page Specifications
  const pageSectionNum = isFullScope ? '6' : (opts.featureId ? '4' : '4')
  body += h(pageSectionNum, 'Page Specifications', 0)
  pages.rows.forEach((page, pi) => {
    const pNum = `${pageSectionNum}.${pi + 1}`
    const linked = Array.isArray(page.linked_features) ? page.linked_features : []
    body += h(pNum, page.name, 1)
    body += `<div class="flex items-center gap-2 mb-2">
      <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">${page.page_type || 'page'}</span>
    </div>`
    if (linked.length) body += `<p class="text-xs text-gray-400 mb-2">Linked features: ${linked.map((f: any) => f.name).join(', ')}</p>`
    if (page.ai_description) {
      body += `<div class="text-sm text-gray-700 leading-relaxed">${mdToHtml(page.ai_description)}</div>`
    }
  })

  // Build TOC HTML
  const tocHtml = toc.map(t => {
    const indent = t.level * 16
    const weight = t.level === 0 ? 'font-semibold' : 'font-normal'
    const color = t.level === 0 ? 'text-gray-800' : 'text-gray-600'
    return `<a href="#s-${t.num.replace(/\./g, '-')}" class="block py-0.5 text-sm ${weight} ${color} hover:text-green-700" style="padding-left: ${indent}px">${t.num} ${t.title}</a>`
  }).join('')

  // Assemble full HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BRD — ${projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print { .no-print { display: none; } body { font-size: 12px; } }
    body { font-family: 'Inter', system-ui, sans-serif; }
    a { text-decoration: none; }
  </style>
</head>
<body class="bg-white max-w-4xl mx-auto px-12 py-10">

  <!-- Header -->
  <div class="border-b-2 border-green-600 pb-6 mb-8">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
        <span class="text-white font-bold text-lg">+</span>
      </div>
      <span class="text-xl font-bold text-gray-900">butterstack</span>
    </div>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Business Requirements Document</h1>
    <h2 class="text-xl text-green-700 font-semibold">${projectName}</h2>
    <p class="text-sm text-gray-400 mt-2">Generated: ${now} &middot; ${scopeLabel} Level</p>
  </div>

  <!-- Document Control Sheet -->
  <div class="mb-8">
    <h2 class="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Document Control Sheet</h2>
    <table class="w-full text-sm border-collapse">
      <tbody>
        <tr class="border-b border-gray-100"><td class="py-2.5 text-gray-500 w-48 font-medium">Current Version</td><td class="py-2.5 text-gray-800">1.0</td></tr>
        <tr class="border-b border-gray-100"><td class="py-2.5 text-gray-500 font-medium">Project Code</td><td class="py-2.5 text-gray-800">${projectName.toUpperCase().replace(/\s+/g, '-')}-${new Date().getFullYear()}</td></tr>
        <tr class="border-b border-gray-100"><td class="py-2.5 text-gray-500 font-medium">Project Name</td><td class="py-2.5 text-gray-800">${projectName}</td></tr>
        <tr class="border-b border-gray-100"><td class="py-2.5 text-gray-500 font-medium">Document Type</td><td class="py-2.5 text-gray-800">Business Requirements Document</td></tr>
        <tr class="border-b border-gray-100"><td class="py-2.5 text-gray-500 font-medium">Author</td><td class="py-2.5 text-gray-800">${authorName}</td></tr>
        <tr class="border-b border-gray-100"><td class="py-2.5 text-gray-500 font-medium">Reviewed By</td><td class="py-2.5 text-gray-800">${reviewers}</td></tr>
        <tr class="border-b border-gray-100"><td class="py-2.5 text-gray-500 font-medium">Creation Date</td><td class="py-2.5 text-gray-800">${createdAt}</td></tr>
        <tr class="border-b border-gray-100"><td class="py-2.5 text-gray-500 font-medium">Last Updated</td><td class="py-2.5 text-gray-800">${updatedAt || now}</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Revision History -->
  <div class="mb-8">
    <h2 class="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Revision History</h2>
    <table class="w-full text-sm border-collapse">
      <thead><tr class="bg-gray-50 border-b border-gray-200">
        <th class="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Version</th>
        <th class="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
        <th class="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Author</th>
        <th class="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Comments</th>
      </tr></thead>
      <tbody>
        <tr class="border-b border-gray-100">
          <td class="py-2 px-3">1.0</td><td class="py-2 px-3 text-gray-600">${createdAt}</td>
          <td class="py-2 px-3 text-gray-600">${authorName}</td><td class="py-2 px-3 text-gray-600">Initial version — auto-generated</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Table of Contents -->
  <div class="mb-10 bg-gray-50 rounded-xl p-6 border border-gray-100">
    <h2 class="text-lg font-bold text-gray-900 mb-4">Table of Contents</h2>
    <div class="space-y-0.5">${tocHtml}</div>
  </div>

  <!-- Body -->
  ${body}

  <!-- Footer -->
  <div class="border-t border-gray-200 pt-6 mt-10 text-center text-xs text-gray-300">
    <p>Generated by Butterstack — ${now}</p>
  </div>
</body></html>`
}
