import { Injectable, computed, inject, signal } from '@angular/core';
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
  private readonly http = inject(HttpService);

  readonly access_token  = signal<string | null>(null);
  readonly refresh_token = signal<string | null>(null);
  readonly user          = signal<User | null>(null);
  readonly authenticated = computed(() => !!this.access_token());

  constructor() { this.hydrate_from_local_storage(); }

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

  async refresh(): Promise<boolean> {
    const rt = this.refresh_token();
    if (!rt) return false;
    try {
      const res = await this.http.post<LoginResponse>('/auth/refresh', { refresh_token: rt });
      this.apply_token_set(res);
      return true;
    } catch { this.clear(); return false; }
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
