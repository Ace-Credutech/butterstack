import type { UITokens } from '../models/ui-tokens.model'

export function renderForm(t: UITokens): string {
  const fields = t.fields.length ? t.fields : [
    { name: 'Name',  type: 'text' },
    { name: 'Notes', type: 'textarea' },
  ]

  const fieldHtml = fields.map(f => {
    if (f.type === 'textarea') return `
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1.5">${f.name}</label>
        <textarea placeholder="Enter ${f.name.toLowerCase()}..." rows="3"
          class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"></textarea>
      </div>`
    if (f.type === 'select') return `
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1.5">${f.name}</label>
        <select class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none text-gray-500">
          <option>Select ${f.name.toLowerCase()}...</option>
        </select>
      </div>`
    return `
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1.5">${f.name}</label>
        <input type="${f.type}" placeholder="Enter ${f.name.toLowerCase()}..."
          class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none"/>
      </div>`
  }).join('')

  return `
    <div class="min-h-screen bg-gray-50 p-8 font-sans">
      <div class="max-w-xl mx-auto">
        <div class="flex items-center gap-2 mb-6">
          <button class="text-gray-400 hover:text-gray-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="text-lg font-bold text-gray-800">${t.intent}</h1>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div class="space-y-4">
            ${fieldHtml}
            <div class="flex gap-3 pt-2">
              <button class="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg transition">
                ${t.actions[0] ?? 'Save'}
              </button>
              <button class="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>`
}
