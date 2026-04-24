import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService }   from '../../../services/auth.service';
import { GlobalService } from '../../../services/global.service';

@Component({
  selector:    'bs-header',
  imports:     [RouterLink],
  templateUrl: './header.html',
})
export class Header {
  protected readonly auth   = inject(AuthService);
  protected readonly global = inject(GlobalService);
  private   readonly router = inject(Router);

  async logout() {
    await this.auth.logout();
    this.global.clear();
    this.router.navigate(['/']);
  }
}
