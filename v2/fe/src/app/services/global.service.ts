import { computed, effect, Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from './http.service';
import { AuthService } from './auth.service';

export type RolePayload = { id: string; slug: string; name: string; permissions: Record<string, unknown> };
export type OrgPayload  = { id: string; slug: string; name: string; type: 'personal' | 'team'; my_role: string };
export type CurrentUser = { id: string; email: string; name: string; role: RolePayload | null; orgs: OrgPayload[] };
type MeResponse = { code: number; message: string; data: { authenticated: boolean; user?: CurrentUser } };

@Injectable({ providedIn: 'root' })
export class GlobalService {
  private readonly http   = inject(HttpService);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly current_user = signal<CurrentUser | null>(null);
  readonly loaded       = signal(false);
  readonly active_org = computed(() => {
    const u = this.current_user();
    if (!u) return null;
    const preferred_id = this.read_active_org_pref(u.id);
    return u.orgs.find(o => o.id === preferred_id) ?? u.orgs[0] ?? null;
  });
  private in_flight: Promise<void> | null = null;

  constructor() { this.bind_auth_state_sync(); }

  private bind_auth_state_sync(): void {
    effect(() => {
      const is_auth = this.auth.authenticated();
      if (is_auth && !this.current_user()) this.fetch_me();
      if (!is_auth && this.current_user()) this.current_user.set(null);
    });
  }

  bootstrap(): void {
    if (!this.auth.authenticated()) { this.current_user.set(null); this.loaded.set(true); return; }
    this.fetch_me();
  }

  fetch_me(): Promise<void> {
    if (this.in_flight) return this.in_flight;
    this.in_flight = this.run_fetch_me().finally(() => { this.in_flight = null; });
    return this.in_flight;
  }

  private async run_fetch_me(): Promise<void> {
    try {
      const res = await this.http.get<MeResponse>('/auth/me');
      if (res?.data?.authenticated && res.data.user) this.current_user.set(res.data.user);
      else                                           this.handle_unauthenticated();
    } catch { this.current_user.set(null); }
    finally { this.loaded.set(true); }
  }

  private handle_unauthenticated(): void {
    this.current_user.set(null);
    this.auth.clear();
    if (this.router.url.startsWith('/app')) this.router.navigate(['/login']);
  }

  switch_org(org_id: string): void {
    const u = this.current_user();
    if (!u) return;
    localStorage.setItem(`bs_active_org_${u.id}`, org_id);
    this.current_user.set({ ...u });
  }

  private read_active_org_pref(user_id: string): string | null {
    try { return localStorage.getItem(`bs_active_org_${user_id}`); }
    catch { return null; }
  }

  clear(): void { this.current_user.set(null); this.loaded.set(true); }
}
