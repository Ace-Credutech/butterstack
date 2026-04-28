import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService }       from '../../../services/auth.service';
import { GlobalService }     from '../../../services/global.service';
import { PermissionService } from '../../../services/permission.service';
import { BrandMark } from '../../atoms/brand-mark/brand-mark';
import { GravityDirective } from '../../../directives/gravity.directive';
import { UserMenu } from '../user-menu/user-menu';
import { OrgSwitcher } from '../org-switcher/org-switcher';

@Component({
  selector:    'bs-header',
  imports:     [RouterLink, BrandMark, GravityDirective, UserMenu, OrgSwitcher],
  templateUrl: './header.html',
})
export class Header {
  protected readonly auth   = inject(AuthService);
  protected readonly global = inject(GlobalService);
  protected readonly perm   = inject(PermissionService);
}
