import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Header } from '../../components/organisms/header/header';
import { SectionHeader } from '../../components/molecules/section-header/section-header';
import { Table } from '../../components/features/table/table';
import { Chip } from '../../components/atoms/chip/chip';
import { Button } from '../../components/atoms/button/button';
import { CreateRoleModal } from '../../components/organisms/create-role-modal/create-role-modal';
import { AdminService, AdminRole } from '../../services/admin.service';

const role_tone = (slug: string | undefined): 'violet' | 'green' | 'slate' | 'blue' => {
  if (slug === 'super_admin')     return 'violet';
  if (slug === 'product_manager') return 'green';
  if (slug === 'member')          return 'slate';
  return 'blue';
};

const flatten_perm_count = (tree: any): number => {
  if (tree?.['*'] === true) return 99;
  let n = 0;
  for (const key of Object.keys(tree ?? {})) {
    const v = (tree as any)[key];
    if (v === true) n++;
    else if (typeof v === 'object') n += flatten_perm_count(v);
  }
  return n;
};

@Component({
  selector:    'bs-admin-roles',
  imports:     [DatePipe, Header, SectionHeader, Table, Chip, Button, CreateRoleModal],
  templateUrl: './admin-roles.html',
})
export class AdminRoles implements OnInit {
  private readonly admin  = inject(AdminService);
  private readonly router = inject(Router);

  readonly roles       = signal<AdminRole[]>([]);
  readonly loading     = signal(false);
  readonly create_open = signal(false);
  protected role_tone  = role_tone;
  protected perm_count = (r: AdminRole) => flatten_perm_count(r.permissions);

  async ngOnInit() {
    this.loading.set(true);
    try { const res = await this.admin.list_roles(); this.roles.set(res.data.items); }
    finally { this.loading.set(false); }
  }

  open_role(r: AdminRole) { this.router.navigate(['/admin/roles', r.id]); }

  open_create()  { this.create_open.set(true); }
  close_create() { this.create_open.set(false); }

  on_role_created(r: AdminRole) {
    this.roles.update(list => [...list, r]);
    this.router.navigate(['/admin/roles', r.id]);
  }
}
