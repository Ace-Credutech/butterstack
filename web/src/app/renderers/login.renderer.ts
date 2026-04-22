import type { UITokens } from '../models/ui-tokens.model'
import { renderFormField, DEFAULT_DESIGN, type DesignSystem, type PrototypeContext, dsBgGradient, dsBorderAccent, dsCheckboxColor } from './components.renderer'

export function renderLogin(t: UITokens, ds: DesignSystem = DEFAULT_DESIGN, _ctx?: PrototypeContext): string {
  // Fully token-driven — no hardcoded fields/links/checkboxes. Only what the extractor produced renders.
  const fields = t.fields || []
  const checkboxFields = fields.filter(f => (f.type || '').toLowerCase() === 'checkbox')
  const inputFields = fields.filter(f => (f.type || '').toLowerCase() !== 'checkbox')

  const fieldHtml = inputFields.map(f => renderFormField(f.name, f.type, undefined, ds)).join('')
  const checkboxesHtml = checkboxFields
    .map(f => `<label class="flex items-center gap-2 text-sm text-gray-500"><input type="checkbox" class="w-4 h-4 rounded border-gray-300 ${checkColor}"/>${f.name}</label>`)
    .join('')

  const nav = t.navigation || []
  const actions = t.actions || []
  const has = (arr: string[], re: RegExp) => arr.some(s => re.test(s))
  const forgotLink = has(nav, /forgot/i) || has(actions, /forgot/i)
  const registerLink = has(nav, /register|sign ?up/i) || has(actions, /register|sign ?up/i)
  const primaryAction = actions.find(a => !/forgot|register|sign ?up/i.test(a)) || actions[0] || ''
  const bg = dsBgGradient(ds)
  const borderAccent = dsBorderAccent(ds)
  const checkColor = dsCheckboxColor(ds)

  return `
    <div class="min-h-screen ${bg} flex items-center justify-center p-8 ${ds.fontFamily}">
      <div class="w-full max-w-sm">
        <div class="flex items-center gap-2.5 justify-center mb-8">
          <div class="w-8 h-8 ${ds.primaryColor} ${ds.borderRadius} flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
          </div>
          <span class="font-bold text-gray-800 text-lg">${t.entity || 'Application'}</span>
        </div>
        <div class="bg-white rounded-2xl border ${borderAccent} shadow-sm p-8">
          ${t.intent ? `<h1 class="text-xl font-bold text-gray-900 mb-1">${t.intent}</h1>` : ''}
          <div class="space-y-4">
            ${fieldHtml}
            ${checkboxesHtml || forgotLink ? `
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="space-y-2">${checkboxesHtml}</div>
                ${forgotLink ? `<a href="#" class="text-sm ${ds.primaryText} hover:underline">Forgot password?</a>` : ''}
              </div>
            ` : ''}
            ${primaryAction ? `<button class="w-full ${ds.primaryColor} ${ds.primaryHover} text-white text-sm font-semibold py-2.5 ${ds.borderRadius} transition">${primaryAction}</button>` : ''}
          </div>
          ${registerLink ? `<p class="text-center text-sm text-gray-400 mt-6">Don't have an account? <a href="#" class="${ds.primaryText} font-medium hover:underline">Register</a></p>` : ''}
        </div>
      </div>
    </div>`
}
