import type { UITokens } from '../models/ui-tokens.model'
import { renderSidebar, renderHeader } from './shared.renderer'

export function renderList(t: UITokens): string {
  const columns = t.fields.length ? t.fields.map(f => f.name) : t.sections.length ? t.sections : ['Name', 'Status', 'Created']

  const headerCells = columns.map(c =>
    `<th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">${c}</th>`
  ).join('')

  const rows = [1, 2, 3, 4].map(() => `
    <tr class="border-b border-gray-50 hover:bg-gray-50 transition">
      ${columns.map(() => `<td class="px-4 py-3"><div class="h-3 bg-gray-100 rounded animate-pulse w-3/4"></div></td>`).join('')}
    </tr>`).join('')

  const search = t.search ? `
    <div class="relative flex-1">
      <input type="text" placeholder="Search ${t.entity || 'records'}..."
        class="pl-8 pr-4 py-2 text-sm bg-gray-50 border border-gray-100 rounded-lg w-full focus:outline-none"/>
      <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    </div>` : ''

  const filter = t.filters ? `
    <button class="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
      Filter
    </button>` : ''

  const table = `
    <main class="flex-1 p-6 overflow-auto">
      <div class="flex items-center justify-between mb-5">
        <h1 class="text-lg font-bold text-gray-800">${t.intent}</h1>
        ${t.actions[0] ? `<button class="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          ${t.actions[0]}
        </button>` : ''}
      </div>
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        ${search || filter ? `<div class="flex items-center gap-3 p-4 border-b border-gray-50">${search}${filter}</div>` : ''}
        <table class="w-full">
          <thead><tr class="bg-gray-50 border-b border-gray-100">${headerCells}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </main>`

  if (t.layout === 'sidebar-main' && t.navigation.length) return `
    <div class="flex min-h-screen font-sans bg-gray-50">
      ${renderSidebar(t.navigation)}
      <div class="flex-1 flex flex-col overflow-hidden">
        ${renderHeader(t)}
        ${table}
      </div>
    </div>`

  return `<div class="min-h-screen font-sans bg-gray-50">${table}</div>`
}
