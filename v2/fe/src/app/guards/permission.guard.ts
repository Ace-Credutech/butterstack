import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { GlobalService } from '../services/global.service';

export const permission_guard = (permission: string): CanActivateFn => {
  return async () => {
    const perm   = inject(PermissionService);
    const global = inject(GlobalService);
    const router = inject(Router);
    if (!global.loaded()) await global.fetch_me();
    if (perm.can(permission)) return true;
    router.navigate(['/app/projects']);
    return false;
  };
};
