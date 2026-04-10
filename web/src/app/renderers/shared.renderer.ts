import type { UITokens, UIStat } from '../models/ui-tokens.model'

export function renderSidebar(items: string[]): string {
  return `
    <aside class="w-56 bg-white border-r border-gray-100 flex flex-col p-4 gap-1 shrink-0">
      <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">Menu</div>
      ${items.map((item, i) => `
        <a href="#" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition
          ${i === 0 ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}">
          ${item}
        </a>`).join('')}
    </aside>`
}

export function renderHeader(t: UITokens): string {
  return `
    <header class="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <span class="font-semibold text-sm text-gray-800">${t.entity}</span>
      <div class="flex items-center gap-3">
        ${t.search ? `
          <div class="relative">
            <input type="text" placeholder="Search..." class="pl-8 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg w-48 focus:outline-none"/>
            <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>` : ''}
        <div class="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">BA</div>
      </div>
    </header>`
}

export function renderStatsGrid(stats: UIStat[]): string {
  const cols = Math.min(stats.length, 4)
  return `
    <div class="grid grid-cols-${cols} gap-4 mb-6">
      ${stats.map(({ label, value }) => `
        <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p class="text-xs text-gray-400 mb-1">${label}</p>
          <p class="text-2xl font-bold text-gray-800">${value}</p>
        </div>`).join('')}
    </div>`
}

export function renderEmptyState(intent: string): string {
  return `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
      <div class="text-center">
        <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-500">${intent}</p>
        <p class="text-xs text-gray-400 mt-1">Nothing here yet</p>
      </div>
    </div>`
}
