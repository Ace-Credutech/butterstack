import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Header } from '../../components/organisms/header/header';
import { SectionHeader } from '../../components/molecules/section-header/section-header';
import { Button } from '../../components/atoms/button/button';
import { Chip } from '../../components/atoms/chip/chip';
import { Spinner } from '../../components/atoms/spinner/spinner';
import { ErrorAlert } from '../../components/atoms/error-alert/error-alert';
import { PermissionTreeEditor } from '../../components/organisms/permission-tree-editor/permission-tree-editor';
import { AdminService, AdminRole } from '../../services/admin.service';

@Component({
  selector:    'bs-admin-role-edit',
  imports:     [RouterLink, Header, SectionHeader, Button, Chip, Spinner, ErrorAlert, PermissionTreeEditor],
  templateUrl: './admin-role-edit.html',
})
export class AdminRoleEdit implements OnInit {
  private readonly admin  = inject(AdminService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly role        = signal<AdminRole | null>(null);
  readonly permissions = signal<Record<string, unknown>>({});
  readonly loading     = signal(false);
  readonly saving      = signal(false);
  readonly error       = signal<string | null>(null);

  readonly is_system   = computed(() => this.role()?.is_system ?? false);
  readonly json_view   = computed(() => JSON.stringify(this.permissions(), null, 2));

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/admin/roles']); return; }
    this.loading.set(true);
    try {
      const res = await this.admin.list_roles();
      const r   = res.data.items.find(x => x.id === id) ?? null;
      this.role.set(r);
      if (r) this.permissions.set(JSON.parse(JSON.stringify(r.permissions ?? {})));
    } finally {
      this.loading.set(false);
    }
  }

  async save() {
    const r = this.role();
    if (!r) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const res = await this.admin.update_role(r.id, { permissions: this.permissions() });
      this.role.set({ ...r, permissions: res.data.permissions });
      this.permissions.set(JSON.parse(JSON.stringify(res.data.permissions ?? {})));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to save permissions');
    } finally {
      this.saving.set(false);
    }
  }

  reset() {
    const r = this.role();
    if (!r) return;
    this.permissions.set(JSON.parse(JSON.stringify(r.permissions ?? {})));
  }
}
