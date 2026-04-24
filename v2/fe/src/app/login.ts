import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'bs-login',
  imports:  [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex">
      <aside class="hidden lg:flex w-[480px] bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 flex-col justify-between p-10 relative overflow-hidden">
        <div class="absolute inset-0 opacity-10">
          <div class="absolute top-20 -left-10 w-72 h-72 rounded-full border border-white/30"></div>
          <div class="absolute bottom-32 right-6 w-48 h-48 rounded-full border border-white/20"></div>
          <div class="absolute top-1/2 left-1/3 w-96 h-96 rounded-full border border-white/10"></div>
        </div>
        <a routerLink="/" class="flex items-center gap-2.5 relative z-10">
          <div class="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          </div>
          <span class="font-bold text-white tracking-tight text-lg">butterstack</span>
        </a>
        <div class="relative z-10">
          <h2 class="text-2xl font-bold text-white leading-snug mb-3">From idea to<br/>shipped product.</h2>
          <p class="text-green-100/80 text-sm leading-relaxed max-w-xs">Collapse the full delivery lifecycle into one intelligent workspace.</p>
        </div>
        <p class="text-xs text-green-200/50 relative z-10">Built for product teams that ship fast</p>
      </aside>

      <section class="flex-1 flex flex-col bg-gray-50">
        <header class="flex items-center justify-between px-8 py-5 lg:justify-end">
          <a routerLink="/" class="flex items-center gap-2.5 lg:hidden">
            <div class="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            </div>
            <span class="font-bold text-gray-900 tracking-tight">butterstack</span>
          </a>
          <a routerLink="/register" class="text-sm text-gray-400 hover:text-gray-600 transition">Create account</a>
        </header>

        <main class="flex-1 flex items-center justify-center px-6">
          <div class="w-full max-w-sm">
            <h1 class="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p class="text-sm text-gray-400 mb-8">Sign in to your account</p>

            @if (error()) { <div class="mb-4 px-4 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{{ error() }}</div> }

            <form (ngSubmit)="submit()" class="space-y-5">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                <input type="email" [(ngModel)]="email" name="email" required autocomplete="email" placeholder="you@company.com"
                       class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 shadow-sm transition" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
                <div class="relative">
                  <input [type]="show_password() ? 'text' : 'password'" [(ngModel)]="password" name="password" required autocomplete="current-password" placeholder="Enter password"
                         class="w-full px-3.5 py-2.5 pr-10 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 shadow-sm transition" />
                  <button type="button" (click)="show_password.set(!show_password())" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">{{ show_password() ? 'Hide' : 'Show' }}</button>
                </div>
              </div>
              <button type="submit" [disabled]="loading()" class="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition text-sm shadow-sm">
                {{ loading() ? 'Signing in...' : 'Sign in' }}
              </button>
            </form>

            <p class="mt-8 text-center text-sm text-gray-400">
              Don't have an account?
              <a routerLink="/register" class="text-green-600 font-medium hover:underline">Register</a>
            </p>
          </div>
        </main>
      </section>
    </div>
  `,
})
export class Login {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  email    = '';
  password = '';
  readonly show_password = signal(false);
  readonly loading       = signal(false);
  readonly error         = signal<string | null>(null);

  async submit() {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.login(this.email, this.password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/app/projects';
      this.router.navigateByUrl(redirect);
    } catch (e: any) {
      this.error.set(e?.error?.error?.message ?? e?.message ?? 'Sign in failed');
    } finally {
      this.loading.set(false);
    }
  }
}
