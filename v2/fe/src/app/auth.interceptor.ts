import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

export const auth_interceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.API_BASE)) return next(req);
  if (/\/auth\/(login|register|refresh)$/.test(req.url)) return next(req);
  const token = inject(AuthService).access_token();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
