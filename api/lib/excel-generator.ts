import { query } from '../db.ts'
import XLSX from 'xlsx'

interface ExcelOptions {
  projectId: string
  moduleId?: number
  featureId?: number
  pageId?: number
}

export async function generateExcel(opts: ExcelOptions): Promise<Buffer> {
  const moduleIds = await getScopedModuleIds(opts)

  const modules = await query(
    `SELECT id, name, path, depth FROM modules WHERE project_id = $1 ${moduleIds ? `AND id = ANY($2::int[])` : ''} ORDER BY path`,
    moduleIds ? [opts.projectId, moduleIds] : [opts.projectId]
  )

  let featWhere = `f.project_id = $1`
  const featParams: unknown[] = [opts.projectId]
  if (opts.featureId) {
    featWhere += ` AND f.id = $2`
    featParams.push(opts.featureId)
  } else if (moduleIds) {
    featWhere += ` AND f.module_id = ANY($2::int[])`
    featParams.push(moduleIds)
  }

  const features = await query(
    `SELECT f.id, f.name, f.status, f.pm_status, f.summary, f.raw_description, f.ai_description,
            f.test_cases, f.use_cases, f.confidence_score,
            m.name as module_name, m.path as module_path
     FROM features f JOIN modules m ON m.id = f.module_id
     WHERE ${featWhere} ORDER BY m.path, f.order_index`,
    featParams
  )

  let pageWhere = `p.project_id = $1`
  const pageParams: unknown[] = [opts.projectId]
  if (opts.pageId) {
    pageWhere += ` AND p.id = $2`
    pageParams.push(opts.pageId)
  }

  const pages = await query(
    `SELECT p.id, p.name, p.page_type, p.status, p.pm_status, p.summary,
       COALESCE((SELECT string_agg(f.name, ', ') FROM page_features pf JOIN features f ON f.id = pf.feature_id WHERE pf.page_id = p.id), '') as linked_features
     FROM pages p WHERE ${pageWhere} ORDER BY p.order_index`,
    pageParams
  )

  const wb = XLSX.utils.book_new()

  // Sheet 1: Modules
  if (modules.rows.length) {
    const moduleData = modules.rows.map(m => ({
      'ID': m.id, 'Module Name': m.name, 'Path': m.path, 'Depth': m.depth,
    }))
    const ws = XLSX.utils.json_to_sheet(moduleData)
    ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 40 }, { wch: 8 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Modules')
  }

  // Sheet 2: Features
  if (features.rows.length) {
    const featData = features.rows.map(f => ({
      'ID': f.id,
      'Feature': f.name,
      'Module': f.module_name,
      'Module Path': f.module_path,
      'Status': f.status,
      'PM Status': f.pm_status || 'not_started',
      'Summary': f.summary || '',
      'Completeness': f.confidence_score?.completeness ? `${Math.round(f.confidence_score.completeness * 100)}%` : '',
      'Stability': f.confidence_score?.stability ? `${Math.round(f.confidence_score.stability * 100)}%` : '',
      'Fidelity': f.confidence_score?.intentFidelity ? `${Math.round(f.confidence_score.intentFidelity * 100)}%` : '',
    }))
    const ws = XLSX.utils.json_to_sheet(featData)
    ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 50 }, { wch: 12 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Features')
  }

  // Sheet 3: Pages
  if (pages.rows.length) {
    const pageData = pages.rows.map(p => ({
      'ID': p.id,
      'Page Name': p.name,
      'Type': p.page_type || '',
      'Status': p.status,
      'PM Status': p.pm_status || 'not_started',
      'Summary': p.summary || '',
      'Linked Features': p.linked_features,
    }))
    const ws = XLSX.utils.json_to_sheet(pageData)
    ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 50 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Pages')
  }

  // Sheet 4: Requirements (extracted sections from AI docs)
  if (features.rows.length) {
    const reqData = features.rows.map(f => {
      const desc = f.ai_description || ''
      return {
        'Feature': f.name,
        'Module': f.module_name,
        'Business Context': extractSection(desc, 'Business Context'),
        'Functional Requirements': extractSection(desc, 'Functional Requirements'),
        'Acceptance Criteria': extractSection(desc, 'Acceptance Criteria'),
        'Assumptions': extractSection(desc, 'Assumptions'),
        'Validations': extractSection(desc, 'Validations'),
        'Error Messages': extractSection(desc, 'Error Messages'),
        'Business Rules': extractSection(desc, 'Logic and Business Rules'),
      }
    })
    const ws = XLSX.utils.json_to_sheet(reqData)
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Requirements')
  }

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

// Also keep JSON export for the Excel tab in-app view
export async function generateExcelData(opts: ExcelOptions) {
  const moduleIds = await getScopedModuleIds(opts)

  const modules = await query(
    `SELECT id, name, path, depth FROM modules WHERE project_id = $1 ${moduleIds ? `AND id = ANY($2::int[])` : ''} ORDER BY path`,
    moduleIds ? [opts.projectId, moduleIds] : [opts.projectId]
  )

  let featWhere = `f.project_id = $1`
  const featParams: unknown[] = [opts.projectId]
  if (opts.featureId) {
    featWhere += ` AND f.id = $2`
    featParams.push(opts.featureId)
  } else if (moduleIds) {
    featWhere += ` AND f.module_id = ANY($2::int[])`
    featParams.push(moduleIds)
  }

  const features = await query(
    `SELECT f.id, f.name, f.status, f.pm_status, f.summary, f.raw_description, f.ai_description,
            f.confidence_score, m.name as module_name, m.path as module_path
     FROM features f JOIN modules m ON m.id = f.module_id
     WHERE ${featWhere} ORDER BY m.path, f.order_index`,
    featParams
  )

  const pages = await query(
    `SELECT p.id, p.name, p.page_type, p.status, p.pm_status, p.summary,
       COALESCE((SELECT string_agg(f.name, ', ') FROM page_features pf JOIN features f ON f.id = pf.feature_id WHERE pf.page_id = p.id), '') as linked_features
     FROM pages p WHERE p.project_id = $1 ORDER BY p.order_index`,
    [opts.projectId]
  )

  return {
    modules: modules.rows.map(m => ({ ID: m.id, Name: m.name, Path: m.path, Depth: m.depth })),
    features: features.rows.map(f => ({
      ID: f.id, Feature: f.name, Module: f.module_name, 'Module Path': f.module_path,
      Status: f.status, 'PM Status': f.pm_status || '', Summary: f.summary || '',
      Completeness: f.confidence_score?.completeness ?? '', Stability: f.confidence_score?.stability ?? '',
      Fidelity: f.confidence_score?.intentFidelity ?? '',
    })),
    pages: pages.rows.map(p => ({
      ID: p.id, Page: p.name, Type: p.page_type || '', Status: p.status,
      Summary: p.summary || '', 'Linked Features': p.linked_features,
    })),
    requirements: features.rows.map(f => {
      const desc = f.ai_description || ''
      return {
        Feature: f.name, Module: f.module_name,
        'Acceptance Criteria': extractSection(desc, 'Acceptance Criteria'),
        Assumptions: extractSection(desc, 'Assumptions'),
        Validations: extractSection(desc, 'Validations'),
        'Error Messages': extractSection(desc, 'Error Messages'),
        'Business Rules': extractSection(desc, 'Logic and Business Rules'),
      }
    }),
  }
}

async function getScopedModuleIds(opts: ExcelOptions): Promise<number[] | null> {
  if (!opts.moduleId) return null
  const result = await query(
    `WITH RECURSIVE tree AS (
       SELECT id FROM modules WHERE id = $1
       UNION ALL
       SELECT m.id FROM modules m JOIN tree t ON m.parent_id = t.id
     ) SELECT id FROM tree`,
    [opts.moduleId]
  )
  return result.rows.map(r => r.id)
}

function extractSection(text: string, sectionName: string): string {
  const re = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`)
  const match = text.match(re)
  return match ? match[1].trim().slice(0, 1000) : ''
}
