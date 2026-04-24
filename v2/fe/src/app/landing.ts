import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'bs-landing',
  imports:  [RouterLink],
  template: `
    <div class="min-h-screen bg-white flex flex-col">
      <header class="flex items-center justify-between px-8 py-5">
        <a routerLink="/" class="flex items-center gap-2.5">
          <div class="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          </div>
          <span class="font-bold text-gray-900 tracking-tight">butterstack</span>
        </a>
        @if (auth.authenticated()) {
          <div class="flex items-center gap-4">
            <button (click)="open_projects()" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition">Projects</button>
            <button (click)="logout()" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition">Logout</button>
          </div>
        } @else {
          <div class="flex items-center gap-4">
            <a routerLink="/login" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition">Sign in</a>
            <a routerLink="/register" class="text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 transition">Get started</a>
          </div>
        }
      </header>

      <main class="flex-1 flex flex-col items-center justify-center px-6 text-center" style="padding-top: 80px; padding-bottom: 120px;">
        <div class="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-1.5 mb-8">
          <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          <span class="text-xs font-medium text-green-700">Early Access — Invite Only</span>
        </div>

        <h1 class="text-5xl font-bold text-gray-900 leading-tight tracking-tight max-w-3xl mb-6">
          From idea to<br/>
          <span class="text-green-600">shipped product</span><br/>
          in one platform.
        </h1>

        <p class="text-lg text-gray-400 max-w-xl mb-10 leading-relaxed">
          Butterstack collapses the full delivery lifecycle — requirements, prototyping, dev, QA, and versioning — into a single intelligent workspace.
        </p>

        <div class="flex items-center gap-3">
          <button (click)="open_projects()" class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition text-sm shadow-sm">Start Building</button>
          <button class="px-6 py-3 border border-gray-200 hover:border-gray-300 text-gray-600 font-medium rounded-xl transition text-sm">Watch Demo</button>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3 mt-14">
          @for (f of features; track f) {
            <div class="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100">
              <div class="w-1.5 h-1.5 rounded-full bg-green-400"></div>
              <span class="text-xs text-gray-500 font-medium">{{ f }}</span>
            </div>
          }
        </div>
      </main>

      <footer class="px-8 py-5 border-t border-gray-100 flex items-center justify-between">
        <span class="text-xs text-gray-300">© 2026 Butterstack</span>
        <span class="text-xs text-gray-300">Built for product teams that ship fast</span>
      </footer>
    </div>
  `,
})
export class Landing {
  protected readonly auth = inject(AuthService);
  private   readonly router = inject(Router);

  readonly features = ['Multilingual input', 'Live prototypes', 'Full versioning', 'Event-sourced', 'Role-aware', 'Export BRD/Excel/Mindmap'];

  open_projects() { this.router.navigate([this.auth.authenticated() ? '/app/projects' : '/login']); }
  async logout() { await this.auth.logout(); }
}
