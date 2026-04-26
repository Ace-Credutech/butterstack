import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Button }       from '../../atoms/button/button';
import { IconButton }   from '../../atoms/icon-button/icon-button';
import { Label }        from '../../atoms/label/label';
import { Select }       from '../../atoms/select/select';
import { ErrorAlert }   from '../../atoms/error-alert/error-alert';
import { FormField }    from '../../molecules/form-field/form-field';
import { AdminService, AdminRole } from '../../../services/admin.service';
import { AuthService }             from '../../../services/auth.service';

const valid_email = (s: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

@Component({
  selector:    'bs-invite-user-modal',
  imports:     [Button, IconButton, Label, Select, ErrorAlert, FormField],
  templateUrl: './invite-user-modal.html',
})
export class InviteUserModal {
  private readonly admin = inject(AdminService);
  private readonly auth  = inject(AuthService);

  readonly open    = input(false);
  readonly roles   = input.required<AdminRole[]>();
  readonly closed  = output<void>();
  readonly invited = output<{ email: string }>();

  readonly first_name = signal('');
  readonly last_name  = signal('');
  readonly email      = signal('');
  readonly role_slug  = signal('member');
  readonly loading    = signal(false);
  readonly success    = signal<string | null>(null);
  readonly error      = signal<string | null>(null);

  readonly role_options = computed(() => this.roles().map(r => ({ value: r.slug, label: r.name })));
  readonly can_submit   = computed(() => this.first_name().trim().length >= 1 && valid_email(this.email()) && !!this.role_slug() && !this.loading());

  on_close() { this.reset(); this.closed.emit(); }

  reset() {
    this.first_name.set('');
    this.last_name.set('');
    this.email.set('');
    this.role_slug.set('member');
    this.loading.set(false);
    this.success.set(null);
    this.error.set(null);
  }

  async submit() {
    if (!this.can_submit()) return;
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    try {
      const email = this.email().trim();
      const first = this.first_name().trim();
      const last  = this.last_name().trim();
      await this.admin.bulk_upsert_users([{
        email,
        first_name: first,
        last_name:  last || undefined,
        role_slug:  this.role_slug(),
        is_active:  true,
      }]);
      await this.auth.forgot_password(email);
      this.success.set(`Invitation sent to ${email}. They'll receive an email to set their password.`);
      this.invited.emit({ email });
      setTimeout(() => this.on_close(), 1600);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to send invite. Try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
