import { Component, signal, HostListener } from '@angular/core'
import { AuthService } from '../../services/auth.service'

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  template: `
    <div class="relative">
      <button (click)="open.set(!open())" class="w-7 h-7 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center text-white text-xs font-semibold transition cursor-pointer select-none">
        {{ initials() }}
      </button>
      @if (open()) {
        <div class="absolute right-0 top-9 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div class="px-4 py-2.5 border-b border-gray-100">
            <p class="text-sm font-medium text-gray-900 truncate">{{ auth.user()?.name }}</p>
            <p class="text-xs text-gray-400 truncate">{{ auth.user()?.email }}</p>
          </div>
          <button (click)="logout()" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"/>
            </svg>
            Sign out
          </button>
        </div>
      }
    </div>
  `,
})
export class UserAvatarComponent {
  open = signal(false)

  constructor(public auth: AuthService) {}

  initials(): string {
    const name = this.auth.user()?.name || ''
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  logout() {
    this.open.set(false)
    this.auth.logout()
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest('app-user-avatar')
    if (!el) this.open.set(false)
  }
}
