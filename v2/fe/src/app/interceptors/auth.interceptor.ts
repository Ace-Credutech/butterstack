import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

const TOKEN_LS_KEY      = 'bs_auth';
const PUBLIC_PATH_REGEX = /\/auth\/(login|register|refresh|logout|forgot-password|reset-password)$/;

const read_token = (): string | null => {
  const raw = localStorage.getItem(TOKEN_LS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw).access_token ?? null; } catch { return null; }
};

const is_api_request   = (url: string) => url.startsWith(environment.API_BASE);
const is_public_route  = (url: string) => PUBLIC_PATH_REGEX.test(url);
const should_intercept = (url: string) => is_api_request(url) && !is_public_route(url);
const attach_auth      = (req: HttpRequest<unknown>, token: string): HttpRequest<unknown> => req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
const is_unauthorized  = (err: unknown): boolean => err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403);

const sign_out = (auth: AuthService, router: Router): void => {
  auth.clear();
  router.navigate(['/login']);
};

const retry_with_refresh = (req: HttpRequest<unknown>, next: HttpHandlerFn, auth: AuthService, router: Router): Observable<any> =>
  from(auth.refresh_singleflight()).pipe(
    switchMap(ok => {
      if (!ok) { sign_out(auth, router); return throwError(() => new Error('refresh failed')); }
      const fresh = read_token();
      if (!fresh) { sign_out(auth, router); return throwError(() => new Error('no token after refresh')); }
      return next(attach_auth(req, fresh));
    }),
  );

export const auth_interceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!should_intercept(req.url)) return next(req);

  const token       = read_token();
  const initial_req = token ? attach_auth(req, token) : req;

  return next(initial_req).pipe(
    catchError((err: unknown) => {
      if (!is_unauthorized(err)) return throwError(() => err);
      return retry_with_refresh(req, next, auth, router);
    }),
  );
};
