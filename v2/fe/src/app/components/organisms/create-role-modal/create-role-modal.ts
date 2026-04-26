import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Button } from '../../atoms/button/button';
import { IconButton } from '../../atoms/icon-button/icon-button';
import { FormField } from '../../molecules/form-field/form-field';
import { Textarea } from '../../atoms/textarea/textarea';
import { Label } from '../../atoms/label/label';
import { ErrorAlert } from '../../atoms/error-alert/error-alert';
import { AdminService, AdminRole } from '../../../services/admin.service';

const slug_pattern = /^[a-z][a-z0-9_]{1,40}$/;

const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

@Component({
  selector:    'bs-create-role-modal',
  imports:     [Button, IconButton, FormField, Textarea, Label, ErrorAlert],
  templateUrl: './create-role-modal.html',
})
export class CreateRoleModal {
  private readonly admin = inject(AdminService);

  readonly open    = input(false);
  readonly closed  = output<void>();
  readonly created = output<AdminRole>();

  readonly name        = signal('');
  readonly slug        = signal('');
  readonly description = signal('');
  readonly slug_dirty  = signal(false);
  readonly submitting  = signal(false);
  readonly error       = signal<string | null>(null);

  readonly slug_valid  = computed(() => slug_pattern.test(this.slug()));
  readonly can_submit  = computed(() => this.name().trim().length >= 2 && this.slug_valid() && !this.submitting());

  on_name_change(v: string) {
    this.name.set(v);
    if (!this.slug_dirty()) this.slug.set(slugify(v));
  }

  on_slug_change(v: string) {
    this.slug.set(v);
    this.slug_dirty.set(true);
  }

  reset() {
    this.name.set('');
    this.slug.set('');
    this.description.set('');
    this.slug_dirty.set(false);
    this.error.set(null);
  }

  on_close() { this.reset(); this.closed.emit(); }

  async submit() {
    if (!this.can_submit()) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      const res = await this.admin.create_role({
        slug:        this.slug(),
        name:        this.name().trim(),
        description: this.description().trim() || undefined,
        permissions: {},
      });
      this.created.emit(res.data);
      this.reset();
      this.closed.emit();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to create role');
    } finally {
      this.submitting.set(false);
    }
  }
}
