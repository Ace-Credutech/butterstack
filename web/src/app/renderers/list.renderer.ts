import type { UITokens } from '../models/ui-tokens.model'
import { renderSidebar, renderHeader } from './shared.renderer'
import { renderDataTable, renderButton, renderButtonGroup, DEFAULT_DESIGN, type DesignSystem } from './components.renderer'

export function renderList(t: UITokens, ds: DesignSystem = DEFAULT_DESIGN): string {
  const columns = t.fields.length ? t.fields.map(f => f.name) : t.sections.length ? t.sections : ['Name', 'Email', 'Status', 'Role', 'Date', 'Actions']

  const search = t.search ? `
    <div class="relative flex-1 max-w-xs">
      <input type="text" placeholder="Search ${t.entity || 'records'}..."
        class="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 ${ds.borderRadius} w-full focus:outline-none focus:border-green-500"/>
      <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    </div>` : ''

  const filter = t.filters ? `
    <button class="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 ${ds.borderRadius} hover:bg-gray-50">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"/></svg>
      Filter
    </button>` : ''

  const actionBtn = t.actions.length > 1
    ? renderButtonGroup(t.actions[0], t.actions.slice(1), ds)
    : t.actions[0] ? renderButton(`+ ${t.actions[0]}`, ds) : ''

  const table = `
    <main class="flex-1 p-6 overflow-auto">
      <div class="flex items-center justify-between mb-5">
        <h1 class="text-lg font-bold text-gray-900">${t.intent}</h1>
        ${actionBtn}
      </div>
      <div class="bg-white ${ds.borderRadius} border border-gray-100 shadow-sm overflow-hidden">
        ${search || filter ? `<div class="flex items-center gap-3 p-4 border-b border-gray-50">${search}${filter}</div>` : ''}
        ${renderDataTable(columns, 6, ds, t.entity || 'record')}
      </div>
    </main>`

  if (t.layout === 'sidebar-main' && t.navigation.length) return `
    <div class="flex min-h-screen ${ds.fontFamily} bg-gray-50">
      ${renderSidebar(t.navigation, ds)}
      <div class="flex-1 flex flex-col overflow-hidden">
        ${renderHeader(t, ds)}
        ${table}
      </div>
    </div>`

  return `<div class="min-h-screen ${ds.fontFamily} bg-gray-50">${table}</div>`
}
