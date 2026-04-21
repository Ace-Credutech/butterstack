import { Component, signal, HostListener } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ApiService } from '../../services/api.service'

@Component({
  selector: 'app-api-keys-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <button (click)="toggle()" class="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition flex items-center gap-2">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"/>
      </svg>
      API Keys
    </button>

    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/20" (click)="open.set(false)">
        <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" (click)="$event.stopPropagation()">
          <h2 class="text-base font-semibold text-gray-900 mb-1">API Keys</h2>
          <p class="text-xs text-gray-400 mb-5">Add your own API keys. These are stored securely and used for AI calls.</p>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">OpenAI API Key</label>
              <input type="password" [(ngModel)]="openaiKey" [placeholder]="maskedKeys()['openai_key'] || 'sk-...'"
                class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Anthropic API Key</label>
              <input type="password" [(ngModel)]="anthropicKey" [placeholder]="maskedKeys()['anthropic_key'] || 'sk-ant-...'"
                class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"/>
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button (click)="save()" [disabled]="saving()"
              class="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition">
              {{ saving() ? 'Saving...' : 'Save Keys' }}
            </button>
            <button (click)="open.set(false)" class="px-4 py-2.5 text-sm text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>

          <p class="text-[10px] text-gray-300 mt-3 text-center">Keys are encrypted and never shared with other users</p>
        </div>
      </div>
    }
  `,
})
export class ApiKeysSettingsComponent {
  open = signal(false)
  saving = signal(false)
  maskedKeys = signal<Record<string, string>>({})
  openaiKey = ''
  anthropicKey = ''

  constructor(private api: ApiService) {}

  async toggle() {
    this.open.update(v => !v)
    if (this.open()) {
      try { this.maskedKeys.set(await this.api.get('/auth/me/api-keys')) } catch {}
    }
  }

  async save() {
    this.saving.set(true)
    const keys: Record<string, string> = {}
    if (this.openaiKey) keys['openai_key'] = this.openaiKey
    if (this.anthropicKey) keys['anthropic_key'] = this.anthropicKey
    await this.api.patch('/auth/me/api-keys', keys)
    this.openaiKey = ''
    this.anthropicKey = ''
    this.maskedKeys.set(await this.api.get('/auth/me/api-keys'))
    this.saving.set(false)
    this.open.set(false)
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.open.set(false) }
}
