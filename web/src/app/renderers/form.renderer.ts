import type { UITokens } from '../models/ui-tokens.model'
import { renderFormField, renderButton, DEFAULT_DESIGN, type DesignSystem, dsBgGradient, dsBorderAccent } from './components.renderer'

export function renderForm(t: UITokens, ds: DesignSystem = DEFAULT_DESIGN): string {
  const fields = t.fields.length ? t.fields : [
    { name: 'Name', type: 'text' },
    { name: 'Email', type: 'email' },
    { name: 'Description', type: 'textarea' },
  ]

  const fieldHtml = fields.map(f => renderFormField(f.name, f.type, undefined, ds)).join('')
  const bg = dsBgGradient(ds)
  const borderAccent = dsBorderAccent(ds)

  return `
    <div class="min-h-screen ${bg} flex items-center justify-center p-8 ${ds.fontFamily}">
      <div class="w-full max-w-xl">
        <div class="flex items-center gap-3 mb-6">
          <button class="p-1.5 ${ds.borderRadius} hover:bg-white/50 text-gray-400 hover:text-gray-600 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 class="text-lg font-bold text-gray-900">${t.intent}</h1>
            <p class="text-xs text-gray-400">${t.entity ? `Manage ${t.entity.toLowerCase()} details` : 'Fill in the required information'}</p>
          </div>
        </div>
        <div class="bg-white rounded-2xl border ${borderAccent} shadow-sm p-6">
          <div class="space-y-5">
            ${fieldHtml}
          </div>
          <div class="flex gap-3 pt-6 mt-6 border-t border-gray-100">
            ${renderButton(t.actions[0] ?? 'Save', ds, 'primary')}
            ${renderButton('Cancel', ds, 'secondary')}
          </div>
        </div>
      </div>
    </div>`
}
