// Dispatcher — routes UITokens to the correct renderer.
// Each renderer is a pure function: UITokens → HTML string.
// Add new page types here as the app grows.

import type { UITokens } from '../models/ui-tokens.model'
import { renderLogin }     from './login.renderer'
import { renderDashboard } from './dashboard.renderer'
import { renderForm }      from './form.renderer'
import { renderList }      from './list.renderer'
import { renderEmptyState } from './shared.renderer'

export function renderTokens(tokens: UITokens): string {
  switch (tokens.page_type) {
    case 'login':     return renderLogin(tokens)
    case 'dashboard': return renderDashboard(tokens)
    case 'landing':   return renderDashboard(tokens)   // reuse dashboard layout for now
    case 'form':      return renderForm(tokens)
    case 'list':      return renderList(tokens)
    case 'detail':    return renderForm(tokens)        // detail uses form-like layout
    case 'settings':  return renderForm(tokens)
    case 'empty':     return renderEmptyState(tokens.intent)
    default:          return renderEmptyState(tokens.intent)
  }
}
