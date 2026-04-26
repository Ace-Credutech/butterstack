import { Component, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Avatar } from '../../atoms/avatar/avatar';
import { Chip } from '../../atoms/chip/chip';
import { Select } from '../../atoms/select/select';
import { Button } from '../../atoms/button/button';
import { IconButton } from '../../atoms/icon-button/icon-button';
import { AdminService, AdminUser, AdminRole } from '../../../services/admin.service';

const role_tone = (slug: string | undefined): 'violet' | 'green' | 'slate' | 'blue' => {
  if (slug === 'super_admin')     return 'violet';
  if (slug === 'product_manager') return 'green';
  if (slug === 'member')          return 'slate';
  return 'blue';
};

@Component({
  selector:    'bs-user-detail-drawer',
  imports:     [DatePipe, Avatar, Chip, Select, Button, IconButton],
  templateUrl: './user-detail-drawer.html',
})
export class UserDetailDrawer {
  private readonly admin = inject(AdminService);

  readonly user           = input<AdminUser | null>(null);
  readonly roles          = input<AdminRole[]>([]);
  readonly closed         = output<void>();
  readonly user_changed   = output<AdminUser>();

  readonly saving        = signal(false);
  readonly chosen_role   = signal('');
  readonly chosen_active = signal<boolean>(true);
  readonly error         = signal<string | null>(null);

  protected role_tone = role_tone;

  protected hydrate(u: AdminUser | null) {
    if (!u) return;
    this.chosen_role.set(u.role?.slug ?? '');
    this.chosen_active.set(u.is_active);
    this.error.set(null);
  }

  ngOnChanges() { this.hydrate(this.user()); }

  protected role_options() {
    return this.roles().map(r => ({ value: r.slug, label: r.name }));
  }

  async save() {
    const u = this.user();
    if (!u) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const body: any = {};
      if (this.chosen_role()   !== (u.role?.slug ?? '')) body.role_slug = this.chosen_role();
      if (this.chosen_active() !== u.is_active)          body.is_active = this.chosen_active();
      if (Object.keys(body).length === 0) { this.closed.emit(); return; }
      const res = await this.admin.update_user(u.id, body);
      this.user_changed.emit(res.data);
      this.closed.emit();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to update user');
    } finally {
      this.saving.set(false);
    }
  }

  toggle_active() { this.chosen_active.set(!this.chosen_active()); }
}
