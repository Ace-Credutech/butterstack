import { Component, Input, signal, HostListener } from '@angular/core'
import { ApiService } from '../../services/api.service'

interface UsageData {
  byModel: { model: string; total_in: number; total_out: number; total_cost: number; call_count: number }[]
  total: { total_in: number; total_out: number; total_cost: number; call_count: number }
  recent: { model: string; tokens_in: number; tokens_out: number; cost_usd: number; endpoint: string; created_at: string }[]
}

@Component({
  selector: 'app-usage-panel',
  standalone: true,
  template: `
    <button (click)="toggle()" class="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition" title="Token Usage">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>
      </svg>
    </button>

    @if (open()) {
      <div class="fixed inset-0 z-50 flex justify-end" (click)="open.set(false)">
        <div class="w-96 bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col" (click)="$event.stopPropagation()">

          <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-900">Token Usage</h3>
              <p class="text-[10px] text-gray-400 mt-0.5">AI API consumption for this project</p>
            </div>
            <button (click)="open.set(false)" class="p-1 rounded-md hover:bg-gray-100 text-gray-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            @if (loading()) {
              <div class="text-center py-10 text-xs text-gray-400">Loading...</div>
            } @else if (data()) {
              <!-- Totals -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-green-50 rounded-lg p-3">
                  <p class="text-[10px] text-green-600 font-medium">Total Calls</p>
                  <p class="text-lg font-bold text-green-700">{{ data()!.total.call_count || 0 }}</p>
                </div>
                <div class="bg-blue-50 rounded-lg p-3">
                  <p class="text-[10px] text-blue-600 font-medium">Est. Cost</p>
                  <p class="text-lg font-bold text-blue-700">\${{ (data()!.total.total_cost || 0).toFixed(4) }}</p>
                </div>
                <div class="bg-amber-50 rounded-lg p-3">
                  <p class="text-[10px] text-amber-600 font-medium">Tokens In</p>
                  <p class="text-lg font-bold text-amber-700">{{ formatTokens(data()!.total.total_in) }}</p>
                </div>
                <div class="bg-purple-50 rounded-lg p-3">
                  <p class="text-[10px] text-purple-600 font-medium">Tokens Out</p>
                  <p class="text-lg font-bold text-purple-700">{{ formatTokens(data()!.total.total_out) }}</p>
                </div>
              </div>

              <!-- By Model -->
              @if (data()!.byModel.length) {
                <div>
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">By Model</p>
                  @for (m of data()!.byModel; track m.model) {
                    <div class="flex items-center justify-between py-2 border-b border-gray-50">
                      <div>
                        <p class="text-xs font-medium text-gray-700">{{ m.model }}</p>
                        <p class="text-[10px] text-gray-400">{{ m.call_count }} calls</p>
                      </div>
                      <div class="text-right">
                        <p class="text-xs font-medium text-gray-800">{{ formatTokens(+m.total_in + +m.total_out) }} tokens</p>
                        <p class="text-[10px] text-gray-400">\${{ (+m.total_cost).toFixed(4) }}</p>
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Recent Calls -->
              @if (data()!.recent.length) {
                <div>
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent Calls</p>
                  @for (r of data()!.recent; track $index) {
                    <div class="flex items-center justify-between py-1.5 border-b border-gray-50">
                      <div>
                        <p class="text-[11px] text-gray-600">{{ r.endpoint || 'ai-call' }}</p>
                        <p class="text-[10px] text-gray-300">{{ r.model }}</p>
                      </div>
                      <p class="text-[10px] text-gray-500">{{ r.tokens_in + r.tokens_out }} tok</p>
                    </div>
                  }
                </div>
              }

              @if (!data()!.byModel.length) {
                <div class="text-center py-8">
                  <p class="text-xs text-gray-400">No usage data yet</p>
                  <p class="text-[10px] text-gray-300 mt-1">Start a conversation to see token usage</p>
                </div>
              }
            }
          </div>

        </div>
      </div>
    }
  `,
})
export class UsagePanelComponent {
  @Input() projectId = ''

  open    = signal(false)
  loading = signal(false)
  data    = signal<UsageData | null>(null)

  constructor(private api: ApiService) {}

  async toggle() {
    this.open.update(v => !v)
    if (this.open()) {
      this.loading.set(true)
      try {
        this.data.set(await this.api.get<UsageData>('/usage', { projectId: this.projectId }))
      } catch {}
      this.loading.set(false)
    }
  }

  formatTokens(n: number): string {
    if (!n) return '0'
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.open.set(false) }
}
