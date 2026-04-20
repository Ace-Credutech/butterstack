import { query } from '../db.ts'

interface ExcelOptions {
  projectId: string
  moduleId?: number
}

interface SheetRow { [key: string]: string | number | boolean | null }

export async function generateExcelData(opts: ExcelOptions): Promise<{
  modules: SheetRow[]
  features: SheetRow[]
  pages: SheetRow[]
  requirements: SheetRow[]
}> {
  const modules = await query(
    `SELECT id, name, path, depth FROM modules WHERE project_id = $1 ORDER BY path`,
    [opts.projectId]
  )

  const features = await query(
    `SELECT f.id, f.name, f.status, f.summary, f.raw_description, f.ai_description, f.test_cases, f.use_cases,
            f.confidence_score, m.name as module_name, m.path as module_path
     FROM features f JOIN modules m ON m.id = f.module_id
     WHERE f.project_id = $1 ORDER BY m.path, f.order_index`,
    [opts.projectId]
  )

  const pages = await query(
    `SELECT p.id, p.name, p.page_type, p.status, p.summary,
       COALESCE((SELECT string_agg(f.name, ', ') FROM page_features pf JOIN features f ON f.id = pf.feature_id WHERE pf.page_id = p.id), '') as linked_features
     FROM pages p WHERE p.project_id = $1 ORDER BY p.order_index`,
    [opts.projectId]
  )

  const moduleRows: SheetRow[] = modules.rows.map(m => ({
    'ID': m.id, 'Name': m.name, 'Path': m.path, 'Depth': m.depth,
  }))

  const featureRows: SheetRow[] = features.rows.map(f => ({
    'ID': f.id, 'Feature': f.name, 'Module': f.module_name, 'Module Path': f.module_path,
    'Status': f.status, 'Summary': f.summary || '',
    'Completeness': f.confidence_score?.completeness ?? '',
    'Stability': f.confidence_score?.stability ?? '',
    'Intent Fidelity': f.confidence_score?.intentFidelity ?? '',
  }))

  const pageRows: SheetRow[] = pages.rows.map(p => ({
    'ID': p.id, 'Page': p.name, 'Type': p.page_type || '', 'Status': p.status,
    'Summary': p.summary || '', 'Linked Features': p.linked_features,
  }))

  const reqRows: SheetRow[] = features.rows.map(f => {
    const desc = f.ai_description || ''
    const extract = (section: string) => {
      const re = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=\\n## |$)`)
      const match = desc.match(re)
      return match ? match[1].trim().slice(0, 500) : ''
    }
    return {
      'Feature': f.name, 'Module': f.module_name,
      'Acceptance Criteria': extract('Acceptance Criteria'),
      'Assumptions': extract('Assumptions'),
      'Validations': extract('Validations'),
      'Error Messages': extract('Error Messages'),
      'Business Rules': extract('Logic and Business Rules'),
    }
  })

  return { modules: moduleRows, features: featureRows, pages: pageRows, requirements: reqRows }
}

export function csvFromRows(rows: SheetRow[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','))
  }
  return lines.join('\n')
}
