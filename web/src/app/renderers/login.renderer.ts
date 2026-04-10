import type { UITokens } from '../models/ui-tokens.model'

export function renderLogin(t: UITokens): string {
  const fields = t.fields.length ? t.fields : [
    { name: 'Email',    type: 'email' },
    { name: 'Password', type: 'password' },
  ]

  const fieldHtml = fields.map(f => `
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1.5">${f.name}</label>
      <input type="${f.type}" placeholder="${f.type === 'password' ? '••••••••' : `Enter ${f.name.toLowerCase()}...`}"
        class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-green-400 transition"/>
    </div>`).join('')

  return `
    <div class="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-8 font-sans">
      <div class="w-full max-w-sm">
        <div class="flex items-center gap-2 justify-center mb-8">
          <div class="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
          </div>
          <span class="font-bold text-gray-800">${t.entity || 'butterstack'}</span>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h1 class="text-xl font-bold text-gray-800 mb-1">${t.intent}</h1>
          <p class="text-sm text-gray-400 mb-6">Sign in to continue</p>
          <div class="space-y-4">
            ${fieldHtml}
            <button class="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg transition mt-2">
              ${t.actions[0] ?? 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>`
}
