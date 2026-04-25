import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService }   from '../../services/auth.service';
import { GlobalService } from '../../services/global.service';
import { Button }          from '../../components/atoms/button/button';
import { ErrorAlert }      from '../../components/atoms/error-alert/error-alert';
import { FormField }       from '../../components/molecules/form-field/form-field';
import { PasswordField }   from '../../components/molecules/password-field/password-field';
import { AuthShell }       from '../../components/organisms/auth-shell/auth-shell';
import { GravityDirective } from '../../directives/gravity.directive';

@Component({
  selector:    'bs-register',
  imports:     [FormsModule, RouterLink, Button, ErrorAlert, FormField, PasswordField, AuthShell, GravityDirective],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth   = inject(AuthService);
  private readonly global = inject(GlobalService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  readonly first_name = signal('');
  readonly last_name  = signal('');
  readonly email      = signal('');
  readonly password   = signal('');
  readonly loading    = signal(false);
  readonly error      = signal<string | null>(null);

  async submit() {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.register(this.email(), this.password(), this.first_name() || undefined, this.last_name() || undefined);
      await this.global.fetch_me();
      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/app/projects';
      this.router.navigateByUrl(redirect);
    } catch (e: any) {
      this.error.set(e?.error?.error?.message ?? e?.message ?? 'Registration failed');
    } finally {
      this.loading.set(false);
    }
  }
}
