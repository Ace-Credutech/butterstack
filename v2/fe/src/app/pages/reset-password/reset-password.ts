import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Button }         from '../../components/atoms/button/button';
import { ErrorAlert }     from '../../components/atoms/error-alert/error-alert';
import { PasswordField }  from '../../components/molecules/password-field/password-field';
import { AuthShell }      from '../../components/organisms/auth-shell/auth-shell';

@Component({
  selector:    'bs-reset-password',
  imports:     [FormsModule, RouterLink, Button, ErrorAlert, PasswordField, AuthShell],
  templateUrl: './reset-password.html',
})
export class ResetPassword implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly token        = signal('');
  readonly password     = signal('');
  readonly confirm      = signal('');
  readonly loading      = signal(false);
  readonly success      = signal(false);
  readonly error        = signal<string | null>(null);

  readonly mismatch = computed(() => this.confirm().length > 0 && this.password() !== this.confirm());
  readonly too_short = computed(() => this.password().length > 0 && this.password().length < 8);
  readonly can_submit = computed(() => this.password().length >= 8 && this.password() === this.confirm() && !this.loading() && !!this.token());

  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(t);
    if (!t) this.error.set('Missing reset token. Please use the link from your email.');
  }

  async submit() {
    if (!this.can_submit()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.reset_password(this.token(), this.password());
      this.success.set(true);
      setTimeout(() => this.router.navigateByUrl('/login'), 1800);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not reset password.');
    } finally {
      this.loading.set(false);
    }
  }
}
