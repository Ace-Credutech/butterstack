import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export type WsEvent<T = any> = { type: string; payload?: T; scope?: Record<string, unknown>; trace_id?: string; at?: string };
type WsHandler<T = any> = (event: WsEvent<T>) => void;

const RECONNECT_BACKOFFS_MS = [500, 1500, 3000, 5000, 10000];
const TOKEN_LS_KEY = 'bs_auth';

@Injectable({ providedIn: 'root' })
export class WsService {
  private readonly router = inject(Router);
  private socket: WebSocket | null = null;
  private reconnect_attempt        = 0;
  private should_reconnect         = true;
  private handlers: Map<string, Set<WsHandler>> = new Map();
  readonly connected = signal(false);

  private get_token(): string | null {
    const raw = localStorage.getItem(TOKEN_LS_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw).access_token ?? null; } catch { return null; }
  }

  private build_ws_url(): string {
    const api  = environment.API_BASE.replace(/\/$/, '').replace(/^http/i, 'ws').replace(/\/api$/, '');
    const base = api.endsWith('/api') ? api : `${api}/api`;
    const token = this.get_token();
    const qs    = token ? `?access_token=${encodeURIComponent(token)}` : '';
    return `${base}/ws${qs}`;
  }

  connect(): void {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) return;
    this.should_reconnect = true;
    const url  = this.build_ws_url();
    const sock = new WebSocket(url);
    this.socket = sock;

    sock.onopen    = () => { this.connected.set(true); this.reconnect_attempt = 0; };
    sock.onmessage = (ev) => this.dispatch(ev.data);
    sock.onclose   = (ev) => this.on_close(ev);
    sock.onerror   = ()   => { /* noop — close will follow */ };
  }

  disconnect(): void {
    this.should_reconnect = false;
    this.socket?.close();
    this.socket = null;
    this.connected.set(false);
  }

  on<T = any>(type: string, handler: WsHandler<T>): () => void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler as WsHandler);
    this.handlers.set(type, set);
    return () => { const s = this.handlers.get(type); s?.delete(handler as WsHandler); };
  }

  send(event: WsEvent): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(event));
  }

  private dispatch(raw: string): void {
    let event: WsEvent;
    try { event = JSON.parse(raw); } catch { return; }
    if (!event?.type) return;
    const specific = this.handlers.get(event.type);
    const any_     = this.handlers.get('*');
    specific?.forEach(h => { try { h(event); } catch { /* swallow */ } });
    any_?.forEach(h => { try { h(event); } catch { /* swallow */ } });
  }

  private on_close(ev: CloseEvent): void {
    this.connected.set(false);
    this.socket = null;
    if (ev.code === 1008 || ev.code === 4401) { this.router.navigate(['/login']); return; }
    if (!this.should_reconnect) return;
    const delay = RECONNECT_BACKOFFS_MS[Math.min(this.reconnect_attempt, RECONNECT_BACKOFFS_MS.length - 1)];
    this.reconnect_attempt += 1;
    setTimeout(() => this.connect(), delay);
  }
}
