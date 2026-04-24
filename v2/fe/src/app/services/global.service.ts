import { Injectable, inject, signal } from '@angular/core';
import { HttpService } from './http.service';
import { AuthService } from './auth.service';

export type CurrentUser = { id: string; email: string; name: string; role: string | null };
type MeResponse = { code: number; message: string; data: { authenticated: boolean; user?: CurrentUser } };

@Injectable({ providedIn: 'root' })
export class GlobalService {
  private readonly http = inject(HttpService);
  private readonly auth = inject(AuthService);

  readonly current_user = signal<CurrentUser | null>(null);
  readonly loaded       = signal(false);
  private in_flight: Promise<void> | null = null;

  async bootstrap(): Promise<void> {
    if (!this.auth.authenticated()) { this.current_user.set(null); this.loaded.set(true); return; }
    await this.fetch_me();
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
      else this.current_user.set(null);
    } catch { this.current_user.set(null); }
    finally { this.loaded.set(true); }
  }

  clear(): void { this.current_user.set(null); this.loaded.set(true); }
}
