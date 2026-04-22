// Single dynamic renderer — UITokens → HTML.
// No page-type switch, no hardcoded field/link/button defaults. Everything is driven by what the
// extractor produced. Missing tokens simply don't render their block.

import type { UITokens } from '../models/ui-tokens.model'
import {
  DEFAULT_DESIGN, type DesignSystem, type PrototypeContext,
  renderAvatar, renderFormField, renderSectionCard, renderStatCard, renderDataTable,
  renderActivityList, dsBgGradient, dsBorderAccent, dsCheckboxColor,
} from './components.renderer'

export function renderDynamic(t: UITokens, ds: DesignSystem = DEFAULT_DESIGN, ctx?: PrototypeContext): string {
  const layout = t.layout || inferLayout(t)
  const body = renderBody(t, ds, ctx, layout)

  if (layout === 'sidebar-main') {
    return wrapSidebar(t, ds, ctx, body)
  }
  if (layout === 'centered') {
    return wrapCentered(t, ds, body)
  }
  return wrapFullPage(t, ds, ctx, body)
}

// ── Layout inference — when AI didn't set `layout` ─────────────────────────
function inferLayout(t: UITokens): 'sidebar-main' | 'centered' | 'full-page' {
  const fieldCount = (t.fields || []).length
  const hasStats = (t.stats || []).length > 0
  const hasSections = (t.sections || []).length > 0
  const hasNav = (t.navigation || []).length > 0

  // Short form / auth-style pages → centered
  if (fieldCount > 0 && fieldCount <= 5 && !hasStats && !hasSections && !hasNav) return 'centered'
  // Dashboard-like → sidebar
  if (hasNav && (hasStats || hasSections)) return 'sidebar-main'
  return 'full-page'
}

// ── Content blocks — each renders only if the corresponding token exists ───
function renderBody(t: UITokens, ds: DesignSystem, ctx: PrototypeContext | undefined, layout: string): string {
  const blocks: string[] = []

  // Page header (intent + primary actions) — skip inside centered layout
  if (layout !== 'centered' && (t.intent || (t.actions || []).length)) {
    blocks.push(renderHeaderBar(t, ds))
  }

  // Stats grid
  if ((t.stats || []).length) {
    const statsHtml = t.stats.map(s => renderStatCard(s.label, String(s.value), undefined, ds)).join('')
    blocks.push(`<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">${statsHtml}</div>`)
  }

  // Search + filters toolbar
  if (t.search || t.filters) {
    blocks.push(renderToolbar(t, ds))
  }

  // Form fields (inputs grouped; checkboxes below inline)
  if ((t.fields || []).length) {
    blocks.push(renderFormBlock(t, ds, layout))
  }

  // Tabular / list entity
  if (!(t.fields || []).length && t.entity && (t.search || t.filters || t.sections?.some(s => /list|table|users|items|records/i.test(s)))) {
    blocks.push(renderDataTable(['Name', 'Email', 'Role', 'Status'], 6, ds, t.entity))
  }

  // Named sections (each rendered as a card)
  for (const section of t.sections || []) {
    if (/recent|activity|feed|timeline/i.test(section)) {
      blocks.push(renderSectionCard(section, renderActivityList(ds), ds))
    } else {
      blocks.push(renderSectionCard(section, `<p class="text-sm text-gray-400">No items yet.</p>`, ds))
    }
  }

  return blocks.join('\n')
}

function renderHeaderBar(t: UITokens, ds: DesignSystem): string {
  const actions = (t.actions || [])
  const actionBtns = actions.map((a, i) =>
    `<button class="${i === 0 ? `${ds.primaryColor} ${ds.primaryHover} text-white` : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'} text-sm font-medium px-4 py-2 ${ds.borderRadius} transition">${a}</button>`
  ).join('')
  return `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      ${t.intent ? `<h1 class="text-2xl font-bold text-gray-900">${t.intent}</h1>` : '<div></div>'}
      ${actionBtns ? `<div class="flex items-center gap-2">${actionBtns}</div>` : ''}
    </div>`
}

function renderToolbar(t: UITokens, ds: DesignSystem): string {
  const parts: string[] = []
  if (t.search) {
    parts.push(`
      <div class="relative flex-1 max-w-md">
        <svg class="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/>
        </svg>
        <input type="text" placeholder="Search ${t.entity || 'records'}..." class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 ${ds.borderRadius} focus:outline-none focus:border-gray-300"/>
      </div>`)
  }
  if (t.filters) {
    parts.push(`<button class="px-3 py-2 text-sm text-gray-600 border border-gray-200 ${ds.borderRadius} hover:bg-gray-50 inline-flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v2.379a1.5 1.5 0 0 1-.44 1.06l-5.12 5.12a1.5 1.5 0 0 0-.44 1.061V19.5a1.5 1.5 0 0 1-.879 1.365l-3 1.5A1.5 1.5 0 0 1 9 21V14.12a1.5 1.5 0 0 0-.44-1.06L3.44 7.939A1.5 1.5 0 0 1 3 6.879V4.5Z"/></svg>Filters</button>`)
  }
  return `<div class="flex items-center gap-3 mb-4 flex-wrap">${parts.join('')}</div>`
}

function renderFormBlock(t: UITokens, ds: DesignSystem, layout: string): string {
  const fields = t.fields || []
  const checkboxFields = fields.filter(f => (f.type || '').toLowerCase() === 'checkbox')
  const inputFields = fields.filter(f => (f.type || '').toLowerCase() !== 'checkbox')
  const nav = t.navigation || []
  const actions = t.actions || []
  const SECONDARY_RE = /forgot|register|sign[- ]?up|create account|new user|cancel|terms|t&c|conditions|help/i
  const primaryAction = actions.find(a => !SECONDARY_RE.test(a)) || actions[0] || ''
  const secondaryLinks = [
    ...nav.filter(n => SECONDARY_RE.test(n)),
    ...actions.filter(a => /forgot/i.test(a)),
  ]

  const inputsHtml = inputFields.map(f => renderFormField(f.name, f.type, undefined, ds)).join('')
  const checkboxesHtml = checkboxFields.map(f =>
    `<label class="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" class="w-4 h-4 rounded border-gray-300 ${dsCheckboxColor(ds)}"/>${f.name}</label>`
  ).join('')

  const forgotLink = secondaryLinks.find(l => /forgot/i.test(l))
  const extraLinks = secondaryLinks.filter(l => !/forgot/i.test(l))

  const body = `
    <div class="space-y-4">
      ${inputsHtml}
      ${checkboxesHtml || forgotLink ? `
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="space-y-2">${checkboxesHtml}</div>
          ${forgotLink ? `<a href="#" class="text-sm ${ds.primaryText} hover:underline">${forgotLink}</a>` : ''}
        </div>
      ` : ''}
      ${primaryAction ? `<button class="w-full ${ds.primaryColor} ${ds.primaryHover} text-white text-sm font-semibold py-2.5 ${ds.borderRadius} transition">${primaryAction}</button>` : ''}
    </div>
    ${extraLinks.length ? `<p class="text-center text-sm text-gray-400 mt-6">${extraLinks.map(l => `<a href="#" class="${ds.primaryText} font-medium hover:underline mx-2">${l}</a>`).join('·')}</p>` : ''}`

  if (layout === 'centered') return body
  return `<div class="bg-white rounded-2xl border ${dsBorderAccent(ds)} shadow-sm p-6 max-w-2xl">${body}</div>`
}

// ── Layout wrappers ────────────────────────────────────────────────────────
function wrapCentered(t: UITokens, ds: DesignSystem, inner: string): string {
  const bg = dsBgGradient(ds)
  const borderAccent = dsBorderAccent(ds)
  return `
    <div class="min-h-screen ${bg} flex items-center justify-center p-8 ${ds.fontFamily}">
      <div class="w-full max-w-sm">
        ${t.entity ? `
          <div class="flex items-center gap-2.5 justify-center mb-8">
            <div class="w-8 h-8 ${ds.primaryColor} ${ds.borderRadius} flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
            </div>
            <span class="font-bold text-gray-800 text-lg">${t.entity}</span>
          </div>` : ''}
        <div class="bg-white rounded-2xl border ${borderAccent} shadow-sm p-8">
          ${t.intent ? `<h1 class="text-xl font-bold text-gray-900 mb-1">${t.intent}</h1>` : ''}
          ${inner}
        </div>
      </div>
    </div>`
}

function wrapSidebar(t: UITokens, ds: DesignSystem, ctx: PrototypeContext | undefined, inner: string): string {
  const navItems = t.navigation || []
  const user = ctx?.currentUser
  return `
    <div class="min-h-screen bg-gray-50 ${ds.fontFamily} flex">
      <aside class="w-60 bg-white border-r border-gray-200 p-5 shrink-0">
        <div class="flex items-center gap-2 mb-8">
          <div class="w-7 h-7 ${ds.primaryColor} ${ds.borderRadius} flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          </div>
          <span class="font-bold text-gray-800 text-sm">${t.entity || 'App'}</span>
        </div>
        <nav class="space-y-1">
          ${navItems.map((n, i) => `<a href="#" class="flex items-center gap-2 px-3 py-2 text-sm ${i === 0 ? `${ds.primaryLight} ${ds.primaryText} font-semibold` : 'text-gray-600 hover:bg-gray-50'} ${ds.borderRadius}">${n}</a>`).join('')}
        </nav>
      </aside>
      <main class="flex-1 min-w-0">
        <div class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <span class="text-xs text-gray-400">${t.intent || ''}</span>
          <div class="flex items-center gap-3">
            ${user ? `<span class="text-xs text-gray-600">${user.name}</span>` : ''}
            ${renderAvatar(user?.name || 'User', ds, 8)}
          </div>
        </div>
        <div class="p-6">${inner}</div>
      </main>
    </div>`
}

function wrapFullPage(t: UITokens, ds: DesignSystem, _ctx: PrototypeContext | undefined, inner: string): string {
  return `<div class="min-h-screen bg-gray-50 ${ds.fontFamily} p-6">${inner}</div>`
}
