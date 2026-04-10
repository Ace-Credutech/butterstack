// Converts structured elements from OpenAI into HTML + Tailwind locally.
// Zero API tokens. All rendering happens here.

export type Field      = { label: string; type?: string; placeholder?: string; options?: string[] }
export type StatCard   = { label: string; value: string; trend?: string }
export type NavItem    = { label: string; active?: boolean }
export type DataCard   = { title: string; description?: string; badge?: string; badgeColor?: string }

export type Component =
  | { type: 'sidebar';     items: (string | NavItem)[] }
  | { type: 'header';      title?: string; search?: boolean; avatar?: string }
  | { type: 'page-title';  text: string; subtitle?: string }
  | { type: 'stats-grid';  cards: StatCard[] }
  | { type: 'data-table';  columns: string[]; rows?: string[][] }
  | { type: 'form';        fields: Field[]; submitLabel?: string; title?: string }
  | { type: 'cards-grid';  cards: DataCard[] }
  | { type: 'login';       title?: string; subtitle?: string; fields?: Field[] }
  | { type: 'hero';        title: string; subtitle?: string; cta?: string }
  | { type: 'empty-state'; title: string; subtitle?: string }
  | { type: 'tabs';        items: string[]; active?: string }

export type Layout = 'sidebar-main' | 'centered' | 'full-page'

export type PrototypeElements = {
  layout: Layout
  title:  string
  components: Component[]
}

// ── Component renderers ────────────────────────────────────────────────────────

function renderSidebar(c: Extract<Component, { type: 'sidebar' }>): string {
  const items = c.items.map((item) => {
    const label  = typeof item === 'string' ? item : item.label
    const active = typeof item === 'string' ? false : !!item.active
    return `<a href="#" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition
      ${active ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}">${label}</a>`
  }).join('')
  return `
    <aside class="w-56 bg-white border-r border-gray-100 flex flex-col p-4 gap-1 shrink-0">
      <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">Menu</div>
      ${items}
    </aside>`
}

function renderHeader(c: Extract<Component, { type: 'header' }>): string {
  const search = c.search ? `
    <div class="relative">
      <input type="text" placeholder="Search..." class="pl-8 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg w-56 focus:outline-none"/>
      <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    </div>` : ''
  const avatar = `<div class="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">${c.avatar ?? 'BA'}</div>`
  return `
    <header class="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <span class="font-semibold text-gray-800 text-sm">${c.title ?? ''}</span>
      <div class="flex items-center gap-3">${search}${avatar}</div>
    </header>`
}

function renderPageTitle(c: Extract<Component, { type: 'page-title' }>): string {
  return `
    <div class="mb-5">
      <h1 class="text-xl font-bold text-gray-800">${c.text}</h1>
      ${c.subtitle ? `<p class="text-sm text-gray-400 mt-1">${c.subtitle}</p>` : ''}
    </div>`
}

function renderStatsGrid(c: Extract<Component, { type: 'stats-grid' }>): string {
  const cards = c.cards.map(({ label, value, trend }) => `
    <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p class="text-xs text-gray-400 mb-1">${label}</p>
      <p class="text-2xl font-bold text-gray-800">${value}</p>
      ${trend ? `<p class="text-xs text-green-600 mt-1">${trend}</p>` : ''}
    </div>`).join('')
  const cols = Math.min(c.cards.length, 4)
  return `<div class="grid grid-cols-${cols} gap-4 mb-6">${cards}</div>`
}

function renderDataTable(c: Extract<Component, { type: 'data-table' }>): string {
  const headers = c.columns.map(h =>
    `<th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">${h}</th>`
  ).join('')

  const rows = (c.rows ?? [
    c.columns.map(() => '—'),
    c.columns.map(() => '—'),
    c.columns.map(() => '—'),
  ]).map(row => `
    <tr class="border-b border-gray-50 hover:bg-gray-50 transition">
      ${row.map(cell => `<td class="px-4 py-3 text-sm text-gray-600">${cell}</td>`).join('')}
    </tr>`).join('')

  return `
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
      <table class="w-full">
        <thead><tr class="bg-gray-50 border-b border-gray-100">${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}

function renderForm(c: Extract<Component, { type: 'form' }>): string {
  const fields = c.fields.map(({ label, type = 'text', placeholder, options }) => {
    if (type === 'textarea') return `
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1.5">${label}</label>
        <textarea placeholder="${placeholder ?? ''}" rows="3"
          class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"></textarea>
      </div>`
    if (type === 'select') return `
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1.5">${label}</label>
        <select class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none text-gray-500">
          <option>Select ${label.toLowerCase()}...</option>
          ${(options ?? []).map(o => `<option>${o}</option>`).join('')}
        </select>
      </div>`
    return `
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1.5">${label}</label>
        <input type="${type}" placeholder="${placeholder ?? ''}"
          class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none"/>
      </div>`
  }).join('')

  return `
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      ${c.title ? `<h2 class="text-base font-semibold text-gray-800 mb-4">${c.title}</h2>` : ''}
      <div class="space-y-4">
        ${fields}
        <div class="flex gap-3 pt-2">
          <button class="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg transition">
            ${c.submitLabel ?? 'Save'}
          </button>
          <button class="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Cancel</button>
        </div>
      </div>
    </div>`
}

function renderCardsGrid(c: Extract<Component, { type: 'cards-grid' }>): string {
  const cards = c.cards.map(({ title, description, badge, badgeColor = 'green' }) => `
    <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition cursor-pointer">
      <div class="flex items-start justify-between mb-2">
        <p class="text-sm font-semibold text-gray-800">${title}</p>
        ${badge ? `<span class="text-xs px-2 py-0.5 rounded-full bg-${badgeColor}-50 text-${badgeColor}-700 font-medium">${badge}</span>` : ''}
      </div>
      ${description ? `<p class="text-xs text-gray-400 leading-relaxed">${description}</p>` : ''}
    </div>`).join('')
  const cols = Math.min(c.cards.length, 3)
  return `<div class="grid grid-cols-${cols} gap-4 mb-4">${cards}</div>`
}

function renderLogin(c: Extract<Component, { type: 'login' }>): string {
  const fields = (c.fields ?? [
    { label: 'Email', type: 'email', placeholder: 'you@company.com' },
    { label: 'Password', type: 'password', placeholder: '••••••••' },
  ]).map(({ label, type = 'text', placeholder }) => `
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1.5">${label}</label>
      <input type="${type}" placeholder="${placeholder ?? ''}"
        class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-green-400 transition"/>
    </div>`).join('')
  return `
    <div class="w-full max-w-sm mx-auto">
      <div class="flex items-center gap-2 justify-center mb-8">
        <div class="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
        </div>
        <span class="font-bold text-gray-800">butterstack</span>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h1 class="text-xl font-bold text-gray-800 mb-1">${c.title ?? 'Welcome back'}</h1>
        ${c.subtitle ? `<p class="text-sm text-gray-400 mb-6">${c.subtitle}</p>` : '<div class="mb-6"></div>'}
        <div class="space-y-4">
          ${fields}
          <button class="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg transition mt-2">
            Sign In
          </button>
        </div>
      </div>
    </div>`
}

function renderHero(c: Extract<Component, { type: 'hero' }>): string {
  return `
    <div class="text-center py-16 px-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-3">${c.title}</h1>
      ${c.subtitle ? `<p class="text-gray-500 text-base mb-6 max-w-md mx-auto">${c.subtitle}</p>` : ''}
      ${c.cta ? `<button class="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition">${c.cta}</button>` : ''}
    </div>`
}

function renderTabs(c: Extract<Component, { type: 'tabs' }>): string {
  const tabs = c.items.map(item => {
    const active = item === (c.active ?? c.items[0])
    return `<button class="px-4 py-2 text-sm font-medium rounded-lg transition
      ${active ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">${item}</button>`
  }).join('')
  return `<div class="flex items-center gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">${tabs}</div>`
}

function renderEmptyState(c: Extract<Component, { type: 'empty-state' }>): string {
  return `
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
        <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
        </svg>
      </div>
      <p class="text-sm font-medium text-gray-500">${c.title}</p>
      ${c.subtitle ? `<p class="text-xs text-gray-400 mt-1">${c.subtitle}</p>` : ''}
    </div>`
}

// ── Component dispatcher ───────────────────────────────────────────────────────

function renderComponent(c: Component): string {
  switch (c.type) {
    case 'sidebar':     return renderSidebar(c)
    case 'header':      return renderHeader(c)
    case 'page-title':  return renderPageTitle(c)
    case 'stats-grid':  return renderStatsGrid(c)
    case 'data-table':  return renderDataTable(c)
    case 'form':        return renderForm(c)
    case 'cards-grid':  return renderCardsGrid(c)
    case 'login':       return renderLogin(c)
    case 'hero':        return renderHero(c)
    case 'tabs':        return renderTabs(c)
    case 'empty-state': return renderEmptyState(c)
    default:            return ''
  }
}

// ── Token → Component mapping ─────────────────────────────────────────────────
// UITokens from OpenAI → Component list → HTML. Our system owns this mapping.

import type { UITokens } from './openai.ts'

export function tokensToComponents(t: UITokens): Component[] {
  const components: Component[] = []

  if (t.layout === 'sidebar-main' && t.navigation.length)
    components.push({ type: 'sidebar', items: t.navigation.map((label, i) => ({ label, active: i === 0 })) })

  components.push({ type: 'header', title: t.entity, search: t.search, avatar: 'BA' })

  if (t.page_type === 'login')
    return [{ type: 'login', title: t.intent }]

  if (t.page_type === 'landing')
    return [{ type: 'hero', title: t.intent, cta: t.actions[0] }]

  if (t.sections.length)
    components.push({ type: 'page-title', text: t.entity || t.intent })

  if (t.stats.length)
    components.push({ type: 'stats-grid', cards: t.stats })

  if (t.page_type === 'form' && t.fields.length)
    components.push({ type: 'form', title: t.intent, fields: t.fields.map(f => ({ label: f.name, type: f.type })), submitLabel: t.actions[0] ?? 'Save' })

  if (t.page_type === 'list' || t.page_type === 'dashboard')
    components.push({ type: 'data-table', columns: t.fields.length ? t.fields.map(f => f.name) : t.sections })

  if (t.page_type === 'empty')
    components.push({ type: 'empty-state', title: `No ${t.entity || 'data'} yet`, subtitle: 'Add your first one to get started' })

  return components
}

export function renderTokens(tokens: UITokens): string {
  const components = tokensToComponents(tokens)
  return renderElements({ layout: tokens.layout, title: tokens.intent, components })
}

// ── Main entry ─────────────────────────────────────────────────────────────────

export function renderElements(data: PrototypeElements): string {
  const components = data.components.map(renderComponent).join('\n')

  switch (data.layout) {
    case 'sidebar-main': {
      const sidebar  = data.components.find(c => c.type === 'sidebar')
      const rest     = data.components.filter(c => c.type !== 'sidebar')
      return `
        <div class="flex min-h-screen font-sans bg-gray-50">
          ${sidebar ? renderSidebar(sidebar as Extract<Component, { type: 'sidebar' }>) : ''}
          <div class="flex-1 flex flex-col overflow-hidden">
            ${rest.map(renderComponent).join('\n')}
          </div>
        </div>`
    }
    case 'centered':
      return `<div class="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-8 font-sans">${components}</div>`
    case 'full-page':
    default:
      return `<div class="min-h-screen bg-gray-50 p-6 font-sans">${components}</div>`
  }
}
