import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from './http.service';

type User = { id: string; email: string; name: string };
type LoginResponse = {
  code:    number;
  message: string;
  data: {
    access_token:       string;
    refresh_token:      string;
    expires_in:         number;
    refresh_expires_in: number;
    token_type:         string;
    user:               User;
  };
};

const LS_KEY = 'bs_auth';
type Stored = { access_token: string; refresh_token: string; user: User };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpService);
  private readonly router = inject(Router);

  readonly access_token  = signal<string | null>(null);
  readonly refresh_token = signal<string | null>(null);
  readonly user          = signal<User | null>(null);
  readonly authenticated = computed(() => !!this.access_token());

  constructor() {
    this.hydrate_from_local_storage();
    this.bind_cross_tab_sync();
  }

  private bind_cross_tab_sync(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (e) => this.on_storage_event(e));
  }

  private on_storage_event(e: StorageEvent): void {
    if (e.key !== LS_KEY) return;
    if (e.newValue === null) this.handle_remote_signout();
    else                     this.handle_remote_signin();
  }

  private handle_remote_signin(): void {
    const was_authenticated = this.authenticated();
    this.hydrate_from_local_storage();
    if (was_authenticated) return;
    if (this.is_guest_route(this.router.url)) this.router.navigateByUrl('/app/projects');
  }

  private is_guest_route(url: string): boolean {
    const path = url.split('?')[0];
    return path === '/login' || path === '/register';
  }

  private handle_remote_signout(): void {
    this.access_token.set(null);
    this.refresh_token.set(null);
    this.user.set(null);
    if (this.router.url.startsWith('/app')) this.router.navigate(['/login']);
  }

  private hydrate_from_local_storage(): void {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Stored;
      this.access_token.set(parsed.access_token);
      this.refresh_token.set(parsed.refresh_token);
      this.user.set(parsed.user);
    } catch { localStorage.removeItem(LS_KEY); }
  }

  private persist(): void {
    const stored: Stored = { access_token: this.access_token()!, refresh_token: this.refresh_token()!, user: this.user()! };
    localStorage.setItem(LS_KEY, JSON.stringify(stored));
  }

  private apply_token_set(res: LoginResponse): void {
    this.access_token.set(res.data.access_token);
    this.refresh_token.set(res.data.refresh_token);
    this.user.set(res.data.user);
    this.persist();
  }

  async login(email: string, password: string): Promise<void> {
    const res = await this.http.post<LoginResponse>('/auth/login', { email, password });
    this.apply_token_set(res);
  }

  async register(email: string, password: string, first_name?: string, last_name?: string): Promise<void> {
    const res = await this.http.post<LoginResponse>('/auth/register', { email, password, first_name, last_name });
    this.apply_token_set(res);
  }

  private refresh_in_flight: Promise<boolean> | null = null;

  async refresh(): Promise<boolean> {
    const rt = this.refresh_token();
    if (!rt) return false;
    try {
      const res = await this.http.post<LoginResponse>('/auth/refresh', { refresh_token: rt });
      this.apply_token_set(res);
      return true;
    } catch { this.clear(); return false; }
  }

  refresh_singleflight(): Promise<boolean> {
    if (this.refresh_in_flight) return this.refresh_in_flight;
    this.refresh_in_flight = this.refresh().finally(() => { this.refresh_in_flight = null; });
    return this.refresh_in_flight;
  }

  async logout(): Promise<void> {
    const rt = this.refresh_token();
    if (rt) await this.http.post('/auth/logout', { refresh_token: rt }).catch(() => {});
    this.clear();
  }

  clear(): void {
    this.access_token.set(null);
    this.refresh_token.set(null);
    this.user.set(null);
    localStorage.removeItem(LS_KEY);
  }
}
