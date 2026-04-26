import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService }       from '../../../services/auth.service';
import { GlobalService }     from '../../../services/global.service';
import { PermissionService } from '../../../services/permission.service';
import { BrandMark } from '../../atoms/brand-mark/brand-mark';
import { GravityDirective } from '../../../directives/gravity.directive';

@Component({
  selector:    'bs-header',
  imports:     [RouterLink, BrandMark, GravityDirective],
  templateUrl: './header.html',
})
export class Header {
  protected readonly auth   = inject(AuthService);
  protected readonly global = inject(GlobalService);
  protected readonly perm   = inject(PermissionService);
  private   readonly router = inject(Router);

  async logout() {
    await this.auth.logout();
    this.global.clear();
    this.router.navigate(['/']);
  }
}
