import type { UITokens, UIStat } from '../models/ui-tokens.model'
import { renderAvatar, renderStatCard, DEFAULT_DESIGN, type DesignSystem } from './components.renderer'

export function renderSidebar(items: string[], ds: DesignSystem = DEFAULT_DESIGN): string {
  return `
    <aside class="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div class="p-4 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 ${ds.primaryColor} rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          </div>
          <span class="font-bold text-sm text-gray-800">butterstack</span>
        </div>
      </div>
      <div class="p-3 flex-1">
        <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3 px-2">Menu</div>
        ${items.map((item, i) => `
          <a href="#" class="flex items-center gap-2.5 px-3 py-2 ${ds.borderRadius} text-sm transition mb-0.5
            ${i === 0 ? `${ds.primaryLight} ${ds.primaryText} font-medium` : 'text-gray-500 hover:bg-gray-50'}">
            ${item}
          </a>`).join('')}
      </div>
    </aside>`
}

export function renderHeader(t: UITokens, ds: DesignSystem = DEFAULT_DESIGN): string {
  return `
    <header class="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <div class="flex items-center gap-3">
        <span class="font-semibold text-sm text-gray-800">${t.entity || 'Dashboard'}</span>
        <span class="text-xs text-gray-300">/</span>
        <span class="text-xs text-gray-400">${t.intent.split(' ').slice(0, 3).join(' ')}</span>
      </div>
      <div class="flex items-center gap-3">
        ${t.search ? `
          <div class="relative">
            <input type="text" placeholder="Search..." class="pl-8 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 ${ds.borderRadius} w-48 focus:outline-none"/>
            <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>` : ''}
        <button class="p-2 rounded-lg hover:bg-gray-50 text-gray-400 relative">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/></svg>
          <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        ${renderAvatar(ds.avatarText || 'AS', ds)}
      </div>
    </header>`
}

export function renderStatsGrid(stats: UIStat[], ds: DesignSystem = DEFAULT_DESIGN): string {
  const cols = Math.min(stats.length, 4)
  const trends = ['+12%', '+5%', '-3%', '+8%']
  return `
    <div class="grid grid-cols-${cols} gap-4 mb-6">
      ${stats.map((s, i) => renderStatCard(s.label, s.value, trends[i % trends.length], ds)).join('')}
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
