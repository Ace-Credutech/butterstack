import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_LS_KEY       = 'bs_auth';
const PUBLIC_PATH_REGEX  = /\/auth\/(login|register|refresh)$/;

const read_token = (): string | null => {
  const raw = localStorage.getItem(TOKEN_LS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw).access_token ?? null; } catch { return null; }
};

const is_api_request  = (url: string) => url.startsWith(environment.API_BASE);
const is_public_route = (url: string) => PUBLIC_PATH_REGEX.test(url);

const on_auth_failure = (router: Router) => {
  localStorage.removeItem(TOKEN_LS_KEY);
  router.navigate(['/login']);
};

export const auth_interceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  if (!is_api_request(req.url))  return next(req);
  if (is_public_route(req.url))  return next(req);

  const token = read_token();
  const authed_req = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed_req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) on_auth_failure(router);
      return throwError(() => err);
    }),
  );
};
