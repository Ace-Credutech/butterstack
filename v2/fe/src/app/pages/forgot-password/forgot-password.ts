import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Button }       from '../../components/atoms/button/button';
import { ErrorAlert }   from '../../components/atoms/error-alert/error-alert';
import { FormField }    from '../../components/molecules/form-field/form-field';
import { AuthShell }    from '../../components/organisms/auth-shell/auth-shell';

@Component({
  selector:    'bs-forgot-password',
  imports:     [FormsModule, RouterLink, Button, ErrorAlert, FormField, AuthShell],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);

  readonly email   = signal('');
  readonly loading = signal(false);
  readonly sent    = signal(false);
  readonly error   = signal<string | null>(null);

  async submit() {
    if (!this.email() || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.forgot_password(this.email());
      this.sent.set(true);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not send reset email. Try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
