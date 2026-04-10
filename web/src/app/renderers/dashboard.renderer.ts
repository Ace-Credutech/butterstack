import type { UITokens } from '../models/ui-tokens.model'
import { renderSidebar, renderHeader, renderStatsGrid } from './shared.renderer'

export function renderDashboard(t: UITokens): string {
  const stats   = t.stats.length ? t.stats : [
    { label: 'Total',    value: '—' },
    { label: 'Active',   value: '—' },
    { label: 'Pending',  value: '—' },
  ]
  const sections = t.sections.length ? t.sections : ['Recent Activity', 'Overview']

  const sectionHtml = sections.map(s => `
    <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p class="text-sm font-semibold text-gray-700 mb-3">${s}</p>
      <div class="space-y-2">
        ${[1,2,3].map(() => `<div class="h-3 bg-gray-100 rounded animate-pulse"></div>`).join('')}
      </div>
    </div>`).join('')

  const main = `
    <main class="flex-1 p-6 overflow-auto">
      <h1 class="text-xl font-bold text-gray-800 mb-5">${t.intent}</h1>
      ${renderStatsGrid(stats)}
      <div class="grid grid-cols-2 gap-4">${sectionHtml}</div>
    </main>`

  return `
    <div class="flex min-h-screen font-sans bg-gray-50">
      ${t.navigation.length ? renderSidebar(t.navigation) : ''}
      <div class="flex-1 flex flex-col overflow-hidden">
        ${renderHeader(t)}
        ${main}
      </div>
    </div>`
}
