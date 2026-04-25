import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, Observable, timeout } from 'rxjs';
import { environment } from '../../environments/environment';

type Primitive  = string | number | boolean;
type ParamsLike = Record<string, Primitive | Primitive[] | null | undefined>;

const TOKEN_LS_KEY = 'bs_auth';

@Injectable({ providedIn: 'root' })
export class HttpService {
  private readonly http  = inject(HttpClient);
  readonly loading_count = signal(0);
  readonly loading       = () => this.loading_count() > 0;

  private get_token(): string | null {
    const raw = localStorage.getItem(TOKEN_LS_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw).access_token ?? null; } catch { return null; }
  }

  private build_url(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const base = environment.API_BASE.replace(/\/$/, '');
    const p    = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }

  private to_http_params(params: ParamsLike | undefined): HttpParams {
    let http_params = new HttpParams();
    if (!params) return http_params;
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === undefined || v === '') continue;
      if (Array.isArray(v)) for (const item of v) http_params = http_params.append(k, String(item));
      else                  http_params = http_params.set(k, String(v));
    }
    return http_params;
  }

  private prune_empty(body: any): any {
    if (body === null || body === undefined) return body;
    if (Array.isArray(body)) return body.map(v => this.prune_empty(v)).filter(v => v !== undefined);
    if (typeof body !== 'object') return body;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'object') {
        const cleaned = this.prune_empty(v);
        if (cleaned !== undefined && !(typeof cleaned === 'object' && Object.keys(cleaned as object).length === 0)) out[k] = cleaned;
      } else out[k] = v;
    }
    return out;
  }

  private with_auth_header(): Record<string, string> {
    const token = this.get_token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private normalize_error(err: any): any {
    if (err instanceof HttpErrorResponse) return err.error?.error ?? err.error ?? { code: err.status, message: err.message };
    return err;
  }

  private static readonly REQUEST_TIMEOUT_MS = 8000;

  private send<T>(obs: Observable<T>): Promise<T> {
    return this.wrap(() => firstValueFrom(obs.pipe(timeout(HttpService.REQUEST_TIMEOUT_MS))));
  }

  private async wrap<T>(run: () => Promise<T>): Promise<T> {
    this.loading_count.update(n => n + 1);
    try { return await run(); }
    catch (err: any) { throw this.normalize_error(err); }
    finally { this.loading_count.update(n => Math.max(0, n - 1)); }
  }

  get<T = any>(path: string, query_params?: ParamsLike): Promise<T> {
    return this.send(this.http.get<T>(this.build_url(path), {
      params:  this.to_http_params(query_params),
      headers: this.with_auth_header(),
    }));
  }

  post<T = any>(path: string, body?: any, query_params?: ParamsLike): Promise<T> {
    return this.send(this.http.post<T>(this.build_url(path), this.prune_empty(body) ?? {}, {
      params:  this.to_http_params(query_params),
      headers: this.with_auth_header(),
    }));
  }

  put<T = any>(path: string, body?: any, query_params?: ParamsLike): Promise<T> {
    return this.send(this.http.put<T>(this.build_url(path), this.prune_empty(body) ?? {}, {
      params:  this.to_http_params(query_params),
      headers: this.with_auth_header(),
    }));
  }

  patch<T = any>(path: string, body?: any, query_params?: ParamsLike): Promise<T> {
    return this.send(this.http.patch<T>(this.build_url(path), this.prune_empty(body) ?? {}, {
      params:  this.to_http_params(query_params),
      headers: this.with_auth_header(),
    }));
  }

  delete<T = any>(path: string, query_params?: ParamsLike): Promise<T> {
    return this.send(this.http.delete<T>(this.build_url(path), {
      params:  this.to_http_params(query_params),
      headers: this.with_auth_header(),
    }));
  }

  download(path: string, query_params?: ParamsLike): Promise<Blob> {
    return this.send(this.http.get(this.build_url(path), {
      params:       this.to_http_params(query_params),
      headers:      this.with_auth_header(),
      responseType: 'blob',
    }));
  }
}
