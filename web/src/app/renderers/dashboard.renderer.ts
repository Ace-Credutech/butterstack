import type { UITokens } from '../models/ui-tokens.model'
import { renderSidebar, renderHeader, renderStatsGrid } from './shared.renderer'
import { renderSectionCard, renderActivityList, renderDataTable, DEFAULT_DESIGN, type DesignSystem } from './components.renderer'

export function renderDashboard(t: UITokens, ds: DesignSystem = DEFAULT_DESIGN): string {
  const stats = t.stats.length ? t.stats : [
    { label: 'Total Users', value: '1,248' },
    { label: 'Active Users', value: '847' },
    { label: 'Total Projects', value: '32' },
    { label: 'Completion Rate', value: '94%' },
  ]
  const sections = t.sections.length ? t.sections : ['Recent Activity', 'Quick Stats']

  const sectionContent = sections.map(s => {
    const lc = s.toLowerCase()
    if (lc.includes('activity') || lc.includes('recent')) {
      return renderSectionCard(s, renderActivityList(ds))
    }
    if (lc.includes('chart') || lc.includes('graph') || lc.includes('analytics')) {
      return renderSectionCard(s, `
        <div class="h-40 bg-gradient-to-t from-green-50 to-white rounded-lg flex items-end justify-center gap-2 p-4">
          ${[40, 65, 45, 80, 55, 70, 90, 60].map(h => `<div class="w-6 ${ds.primaryColor} rounded-t opacity-70" style="height: ${h}%"></div>`).join('')}
        </div>
        <div class="flex justify-between text-xs text-gray-400 mt-2 px-2"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span><span>Today</span></div>`)
    }
    return renderSectionCard(s, `
      <div class="space-y-3">
        <div class="flex items-center justify-between"><span class="text-sm text-gray-600">Module completion</span><span class="text-sm font-medium text-gray-800">78%</span></div>
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-full ${ds.primaryColor} rounded-full" style="width: 78%"></div></div>
        <div class="flex items-center justify-between"><span class="text-sm text-gray-600">Requirements finalized</span><span class="text-sm font-medium text-gray-800">45/58</span></div>
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-full ${ds.primaryColor} rounded-full" style="width: 77%"></div></div>
      </div>`)
  }).join('')

  const main = `
    <main class="flex-1 p-6 overflow-auto">
      <div class="flex items-center justify-between mb-5">
        <h1 class="text-xl font-bold text-gray-900">${t.intent}</h1>
        <div class="flex gap-2">
          <button class="px-3 py-1.5 text-xs font-medium border border-gray-200 ${ds.borderRadius} text-gray-500 hover:bg-gray-50">This Week</button>
          <button class="px-3 py-1.5 text-xs font-medium ${ds.primaryColor} text-white ${ds.borderRadius}">This Month</button>
        </div>
      </div>
      ${renderStatsGrid(stats, ds)}
      <div class="grid grid-cols-2 gap-4">${sectionContent}</div>
    </main>`

  return `
    <div class="flex min-h-screen ${ds.fontFamily} bg-gray-50">
      ${t.navigation.length ? renderSidebar(t.navigation, ds) : ''}
      <div class="flex-1 flex flex-col overflow-hidden">
        ${renderHeader(t, ds)}
        ${main}
      </div>
    </div>`
}
