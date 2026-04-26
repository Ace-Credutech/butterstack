import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Avatar } from '../../atoms/avatar/avatar';
import { Chip } from '../../atoms/chip/chip';
import { Select } from '../../atoms/select/select';
import { Button } from '../../atoms/button/button';
import { IconButton } from '../../atoms/icon-button/icon-button';
import { FormField } from '../../molecules/form-field/form-field';
import { AdminService, AdminUser, AdminRole } from '../../../services/admin.service';
import { diff_changed, has_changes } from '../../../utils/diff';

const role_tone = (slug: string | undefined): 'violet' | 'green' | 'slate' | 'blue' => {
  if (slug === 'super_admin')     return 'violet';
  if (slug === 'product_manager') return 'green';
  if (slug === 'member')          return 'slate';
  return 'blue';
};

const split_full_name = (full: string): { first: string; last: string } => {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
};

@Component({
  selector:    'bs-user-detail-drawer',
  imports:     [DatePipe, Avatar, Chip, Select, Button, IconButton, FormField],
  templateUrl: './user-detail-drawer.html',
})
export class UserDetailDrawer {
  private readonly admin = inject(AdminService);

  readonly user           = input<AdminUser | null>(null);
  readonly roles          = input<AdminRole[]>([]);
  readonly closed         = output<void>();
  readonly user_changed   = output<AdminUser>();

  readonly saving        = signal(false);
  readonly chosen_first  = signal('');
  readonly chosen_last   = signal('');
  readonly chosen_role   = signal('');
  readonly chosen_active = signal<boolean>(true);
  readonly error         = signal<string | null>(null);

  protected role_tone = role_tone;

  readonly preview_name = computed(() => [this.chosen_first(), this.chosen_last()].filter(Boolean).join(' ') || this.user()?.name || '');

  protected hydrate(u: AdminUser | null) {
    if (!u) return;
    const { first, last } = split_full_name(u.name ?? '');
    this.chosen_first.set(first);
    this.chosen_last.set(last);
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
      const original = split_full_name(u.name ?? '');
      const body = diff_changed({
        first_name: { next: this.chosen_first(),  original: original.first  },
        last_name:  { next: this.chosen_last(),   original: original.last   },
        role_slug:  { next: this.chosen_role(),   original: u.role?.slug ?? '' },
        is_active:  { next: this.chosen_active(), original: u.is_active     },
      });
      if (!has_changes(body)) { this.closed.emit(); return; }
      const res = await this.admin.update_user(u.id, body as any);
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
