import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService }   from '../services/auth.service';
import { GlobalService } from '../services/global.service';

const needs_auth  = (data: any) => data?.['authenticated'] === true;
const needs_guest = (data: any) => data?.['authenticated'] === false;

export const auth_guard: CanActivateChildFn = async (route, state) => {
  const auth   = inject(AuthService);
  const global = inject(GlobalService);
  const router = inject(Router);

  if (needs_auth(route.data)) {
    if (!auth.authenticated())                 { router.navigate(['/login'], { queryParams: { redirect: state.url } }); return false; }
    if (!global.loaded())                       await global.fetch_me();
    if (!global.current_user())                { router.navigate(['/login'], { queryParams: { redirect: state.url } }); return false; }
    return true;
  }

  if (needs_guest(route.data) && auth.authenticated()) {
    const path = route.routeConfig?.path;
    if (path === 'login' || path === 'register') { router.navigate(['/app/projects']); return false; }
  }

  return true;
};
