// Dispatcher — routes UITokens to the correct renderer.
// Each renderer is a pure function: UITokens → HTML string.
// Add new page types here as the app grows.

import type { UITokens } from '../models/ui-tokens.model'
import { renderLogin }     from './login.renderer'
import { renderDashboard } from './dashboard.renderer'
import { renderForm }      from './form.renderer'
import { renderList }      from './list.renderer'
import { renderEmptyState } from './shared.renderer'
import { DEFAULT_DESIGN, type DesignSystem } from './components.renderer'

export function renderTokens(tokens: UITokens, ds?: DesignSystem): string {
  const design = ds || DEFAULT_DESIGN
  switch (tokens.page_type) {
    case 'login':     return renderLogin(tokens, design)
    case 'dashboard': return renderDashboard(tokens, design)
    case 'landing':   return renderDashboard(tokens, design)
    case 'form':      return renderForm(tokens, design)
    case 'list':      return renderList(tokens, design)
    case 'detail':    return renderForm(tokens, design)
    case 'settings':  return renderForm(tokens, design)
    case 'empty':     return renderEmptyState(tokens.intent)
    default:          return renderEmptyState(tokens.intent)
  }
}
