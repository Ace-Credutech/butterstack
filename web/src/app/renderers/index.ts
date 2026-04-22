// Single dispatcher. All page types go through one dynamic renderer driven purely by tokens.
// If tokens.page_type === 'empty' or the token payload is trivial, we still show the empty state.

import type { UITokens } from '../models/ui-tokens.model'
import { renderDynamic } from './dynamic.renderer'
import { DEFAULT_DESIGN, type DesignSystem, type PrototypeContext } from './components.renderer'
import { prototypeScripts } from './prototype-scripts'

function renderEmptyState(intent?: string): string {
  return `<div class="min-h-screen bg-gray-50 flex items-center justify-center p-8"><p class="text-sm text-gray-400">${intent || 'Nothing to preview yet.'}</p></div>`
}

export function renderTokens(tokens: UITokens, ds?: DesignSystem, ctx?: PrototypeContext): string {
  const design = ds || DEFAULT_DESIGN
  if (ctx?.currentUser) {
    design.avatarText = ctx.currentUser.avatar || ctx.currentUser.name
  }
  if (tokens.page_type === 'empty') return renderEmptyState(tokens.intent)
  const hasAny = (tokens.fields?.length || tokens.stats?.length || tokens.sections?.length || tokens.actions?.length || tokens.navigation?.length || tokens.search || tokens.filters)
  if (!hasAny && !tokens.intent) return renderEmptyState(tokens.intent)
  return renderDynamic(tokens, design, ctx) + prototypeScripts()
}
