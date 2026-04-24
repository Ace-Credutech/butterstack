import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JsonPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

type MeResponse = { code: number; message: string; data: { authenticated: boolean; user?: { id: string; email: string; name: string; role: string | null } } };

@Component({
  selector: 'bs-projects',
  imports:  [JsonPipe, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <a routerLink="/" class="flex items-center gap-2.5">
          <div class="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          </div>
          <span class="font-bold text-gray-900 tracking-tight">butterstack</span>
        </a>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-500">{{ auth.user()?.name }}</span>
          <button (click)="logout()" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition">Logout</button>
        </div>
      </header>

      <section class="max-w-3xl mx-auto p-10 space-y-6">
        <h1 class="text-3xl font-bold text-gray-900">Projects</h1>

        <div class="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
          <h2 class="text-sm font-semibold text-gray-900 mb-3">Backend /api/auth/me</h2>
          @if (loading()) { <p class="text-gray-400 text-sm">Calling backend…</p> }
          @else if (error()) { <p class="text-red-600 text-sm">{{ error() }}</p> }
          @else if (me()) { <pre class="text-xs bg-gray-50 p-3 rounded-lg border border-gray-100 overflow-x-auto">{{ me() | json }}</pre> }
        </div>
      </section>
    </div>
  `,
})
export class Projects {
  protected readonly auth = inject(AuthService);
  private   readonly http = inject(HttpClient);
  private   readonly router = inject(Router);
  readonly me      = signal<MeResponse | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  constructor() {
    this.http.get<MeResponse>(`${environment.API_BASE}/auth/me`).subscribe({
      next: (res) => { this.me.set(res); this.loading.set(false); },
      error: (e)  => { this.error.set(e?.error?.error?.message ?? e?.message ?? String(e)); this.loading.set(false); },
    });
  }

  async logout() { await this.auth.logout(); this.router.navigate(['/']); }
}
