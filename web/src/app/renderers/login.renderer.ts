import type { UITokens } from '../models/ui-tokens.model'
import { renderFormField, DEFAULT_DESIGN, type DesignSystem, type PrototypeContext, dsBgGradient, dsBorderAccent, dsCheckboxColor } from './components.renderer'

export function renderLogin(t: UITokens, ds: DesignSystem = DEFAULT_DESIGN, ctx?: PrototypeContext): string {
  const userEmail = ctx?.currentUser?.email || ''
  const fields = t.fields.length ? t.fields : [
    { name: 'Email', type: 'email' },
    { name: 'Password', type: 'password' },
  ]

  const fieldHtml = fields.map(f => renderFormField(f.name, f.type, undefined, ds)).join('')
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
          <h1 class="text-xl font-bold text-gray-900 mb-1">${t.intent || 'Sign in'}</h1>
          <p class="text-sm text-gray-400 mb-6">Enter your credentials to continue</p>
          <div class="space-y-4">
            ${fieldHtml}
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm text-gray-500">
                <input type="checkbox" class="w-4 h-4 rounded border-gray-300 ${checkColor}"/>
                Remember me
              </label>
              <a href="#" class="text-sm ${ds.primaryText} hover:underline">Forgot password?</a>
            </div>
            <button class="w-full ${ds.primaryColor} ${ds.primaryHover} text-white text-sm font-semibold py-2.5 ${ds.borderRadius} transition">
              ${t.actions[0] ?? 'Sign In'}
            </button>
          </div>
          <p class="text-center text-sm text-gray-400 mt-6">
            Don't have an account? <a href="#" class="${ds.primaryText} font-medium hover:underline">Register</a>
          </p>
        </div>
      </div>
    </div>`
}
