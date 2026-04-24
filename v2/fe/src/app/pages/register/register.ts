import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService }   from '../../services/auth.service';
import { GlobalService } from '../../services/global.service';
import { Button }          from '../../components/atoms/button/button';
import { ErrorAlert }      from '../../components/atoms/error-alert/error-alert';
import { FormField }       from '../../components/molecules/form-field/form-field';
import { PasswordField }   from '../../components/molecules/password-field/password-field';
import { AuthShell }       from '../../components/organisms/auth-shell/auth-shell';

@Component({
  selector:    'bs-register',
  imports:     [FormsModule, RouterLink, Button, ErrorAlert, FormField, PasswordField, AuthShell],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth   = inject(AuthService);
  private readonly global = inject(GlobalService);
  private readonly router = inject(Router);

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
      this.router.navigateByUrl('/app/projects');
    } catch (e: any) {
      this.error.set(e?.error?.error?.message ?? e?.message ?? 'Registration failed');
    } finally {
      this.loading.set(false);
    }
  }
}
