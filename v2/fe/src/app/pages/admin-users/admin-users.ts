import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Header } from '../../components/organisms/header/header';
import { SectionHeader } from '../../components/molecules/section-header/section-header';
import { SavedViewTabs, SavedView } from '../../components/molecules/saved-view-tabs/saved-view-tabs';
import { FilterBar } from '../../components/molecules/filter-bar/filter-bar';
import { FilterChip } from '../../components/molecules/filter-chip/filter-chip';
import { Pagination } from '../../components/molecules/pagination/pagination';
import { BulkActionBar } from '../../components/molecules/bulk-action-bar/bulk-action-bar';
import { Table } from '../../components/features/table/table';
import { TableColumn, TableSort } from '../../components/features/table/table.types';
import { Avatar } from '../../components/atoms/avatar/avatar';
import { Chip } from '../../components/atoms/chip/chip';
import { Button } from '../../components/atoms/button/button';
import { UserDetailDrawer } from '../../components/organisms/user-detail-drawer/user-detail-drawer';
import { BulkUploadModal } from '../../components/organisms/bulk-upload-modal/bulk-upload-modal';
import { InviteUserModal } from '../../components/organisms/invite-user-modal/invite-user-modal';
import { AdminService, AdminUser, AdminRole } from '../../services/admin.service';
import { CsvService } from '../../services/csv.service';
import { ShortcutService } from '../../services/shortcut.service';
import { SavedViewsService } from '../../services/saved-views.service';
import { Search } from '../../components/atoms/search/search';
import { ElementRef, viewChild } from '@angular/core';

const role_tone = (slug: string | undefined): 'violet' | 'green' | 'slate' | 'blue' => {
  if (slug === 'super_admin')     return 'violet';
  if (slug === 'product_manager') return 'green';
  if (slug === 'member')          return 'slate';
  return 'blue';
};

const empty_filter_state = () => ({ q: '', role: [] as string[], status: [] as string[] });

@Component({
  selector:    'bs-admin-users',
  imports:     [DatePipe, Header, SectionHeader, SavedViewTabs, FilterBar, FilterChip, Pagination, BulkActionBar, Table, Avatar, Chip, Button, UserDetailDrawer, BulkUploadModal, InviteUserModal],
  templateUrl: './admin-users.html',
})
export class AdminUsers implements OnInit {
  private readonly admin     = inject(AdminService);
  private readonly route     = inject(ActivatedRoute);
  private readonly router    = inject(Router);
  private readonly csv       = inject(CsvService);
  private readonly shortcuts = inject(ShortcutService);
  private readonly saved     = inject(SavedViewsService);

  private static readonly PAGE_ID = 'admin_users';
  readonly user_views = signal<{ id: string; label: string; state: any }[]>([]);
  readonly filter_bar_ref = viewChild<ElementRef<HTMLElement>>('filter_bar');

  readonly filters     = signal(empty_filter_state());
  readonly sort        = signal<TableSort | null>(null);
  readonly page        = signal(1);
  readonly size        = signal(25);
  readonly users       = signal<AdminUser[]>([]);
  readonly total       = signal(0);
  readonly loading     = signal(false);
  readonly roles       = signal<AdminRole[]>([]);
  readonly active_view = signal<string>('all');
  readonly selection   = signal<Set<string>>(new Set());
  readonly opened_user = signal<AdminUser | null>(null);

  readonly columns = computed<TableColumn<AdminUser>[]>(() => []);
  readonly role_options = computed(() => this.roles().map(r => ({ value: r.slug, label: r.name, count: r.user_count })));
  readonly status_options = [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Disabled' }];
  readonly active_filter_count = computed(() => {
    const f = this.filters();
    return (f.q ? 1 : 0) + f.role.length + f.status.length;
  });
  readonly bulk_actions = [
    { id: 'disable', label: 'Disable selected', danger: true },
  ];
  protected role_tone = role_tone;

  readonly views = computed<SavedView[]>(() => {
    const total  = this.total();
    const built  = [
      { id: 'all',     label: 'All users' },
      { id: 'active',  label: 'Active' },
      { id: 'pending', label: 'Pending' },
      { id: 'disabled', label: 'Disabled' },
    ].map(v => ({ ...v, count: v.id === 'all' ? total : undefined }));
    return [...built, ...this.user_views().map(v => ({ id: v.id, label: v.label }))];
  });

  async ngOnInit() {
    this.read_state_from_url();
    this.user_views.set(this.saved.list<any>(AdminUsers.PAGE_ID));
    this.register_shortcuts();
    await Promise.all([this.load_roles(), this.load_users()]);
  }

  private register_shortcuts() {
    this.shortcuts.register({
      keys:        '/',
      description: 'Focus search',
      group:       'Users',
      match:       (e) => e.key === '/' && !(e.target as HTMLElement)?.matches?.('input,textarea,select,[contenteditable=true]'),
      handler:     (e) => { e.preventDefault(); const el = this.filter_bar_ref()?.nativeElement?.querySelector('input[type=search]') as HTMLInputElement | null; el?.focus(); },
    });
  }

  save_current_view() {
    const label = window.prompt('Name this view');
    if (!label) return;
    const state = { filters: this.filters(), sort: this.sort(), active_view: this.active_view() };
    const rec   = this.saved.save(AdminUsers.PAGE_ID, label, state);
    this.user_views.update(list => [...list, rec]);
    this.active_view.set(rec.id);
  }

  private read_state_from_url() {
    const q = this.route.snapshot.queryParamMap;
    const f = empty_filter_state();
    f.q      = q.get('q') ?? '';
    f.role   = q.getAll('role');
    f.status = q.getAll('status');
    this.filters.set(f);
    const page = parseInt(q.get('page') ?? '1', 10);
    const size = parseInt(q.get('size') ?? '25', 10);
    this.page.set(isNaN(page) ? 1 : page);
    this.size.set(isNaN(size) ? 25 : size);
    const sort = q.get('sort');
    const dir  = q.get('dir');
    if (sort && (dir === 'asc' || dir === 'desc')) this.sort.set({ col: sort, dir });
    const view = q.get('view');
    if (view) this.active_view.set(view);
  }

  private write_state_to_url() {
    const f = this.filters();
    const params: any = {
      q:      f.q || null,
      role:   f.role.length ? f.role : null,
      status: f.status.length ? f.status : null,
      page:   this.page() === 1 ? null : this.page(),
      size:   this.size() === 25 ? null : this.size(),
      sort:   this.sort()?.col ?? null,
      dir:    this.sort()?.dir ?? null,
      view:   this.active_view() === 'all' ? null : this.active_view(),
    };
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private async load_roles() {
    try { const res = await this.admin.list_roles(); this.roles.set(res.data.items); } catch {}
  }

  private build_query() {
    const f = this.filters();
    const view = this.active_view();
    return {
      q:         f.q || undefined,
      role_slug: f.role[0],
      is_active: view === 'active' ? 'true' as const : view === 'disabled' ? 'false' as const : (f.status[0] as 'true' | 'false' | undefined),
      sort:      (this.sort()?.col ?? 'created_at') as 'created_at' | 'name' | 'email',
      dir:       this.sort()?.dir ?? 'desc',
      page:      this.page(),
      size:      this.size(),
    };
  }

  async load_users() {
    this.loading.set(true);
    try {
      const res = await this.admin.list_users(this.build_query());
      this.users.set(res.data.items);
      this.total.set(res.data.total);
    } finally {
      this.loading.set(false);
    }
  }

  on_query(q: string) {
    this.filters.update(f => ({ ...f, q }));
    this.page.set(1);
    this.write_state_to_url();
    this.load_users();
  }

  on_role_filter(role: string[]) {
    this.filters.update(f => ({ ...f, role }));
    this.page.set(1);
    this.write_state_to_url();
    this.load_users();
  }

  on_status_filter(status: string[]) {
    this.filters.update(f => ({ ...f, status }));
    this.page.set(1);
    this.write_state_to_url();
    this.load_users();
  }

  clear_filters() {
    this.filters.set(empty_filter_state());
    this.page.set(1);
    this.write_state_to_url();
    this.load_users();
  }

  on_view(id: string) {
    this.active_view.set(id);
    const custom = this.user_views().find(v => v.id === id);
    if (custom) {
      const s = custom.state as { filters: any; sort: TableSort | null; active_view: string };
      if (s?.filters) this.filters.set(s.filters);
      if (s?.sort !== undefined) this.sort.set(s.sort);
    }
    this.page.set(1);
    this.write_state_to_url();
    this.load_users();
  }

  on_page(p: number) {
    this.page.set(p);
    this.write_state_to_url();
    this.load_users();
  }

  on_size(s: number) {
    this.size.set(s);
    this.page.set(1);
    this.write_state_to_url();
    this.load_users();
  }

  on_sort(s: TableSort | null) {
    this.sort.set(s);
    this.write_state_to_url();
    this.load_users();
  }

  open_user(u: AdminUser) { this.opened_user.set(u); }
  close_drawer()           { this.opened_user.set(null); }
  clear_selection()        { this.selection.set(new Set()); }

  readonly bulk_open = signal(false);
  open_bulk()  { this.bulk_open.set(true); }
  close_bulk() { this.bulk_open.set(false); }

  readonly valid_role_slugs = computed(() => this.roles().map(r => r.slug));

  on_bulk_applied(_: { success: number; updated: number; created: number; failed: number }) {
    this.load_users();
  }

  async export_csv() {
    const res = await this.admin.list_users_full(this.build_query());
    this.csv.download(
      `users-${new Date().toISOString().slice(0, 10)}.csv`,
      ['email', 'name', 'role_slug', 'is_active', 'joined_at'],
      res.data.items,
      u => [u.email, u.name, u.role?.slug ?? '', u.is_active, u.created_at],
    );
  }

  readonly invite_open = signal(false);
  open_invite()  { this.invite_open.set(true); }
  close_invite() { this.invite_open.set(false); }

  on_invited(_: { email: string }) {
    this.load_users();
  }

  on_user_changed(u: AdminUser) {
    this.users.update(list => list.map(x => x.id === u.id ? u : x));
  }

  async on_bulk_action(action: string) {
    if (action !== 'disable') return;
    const ids = Array.from(this.selection());
    await Promise.all(ids.map(id => this.admin.update_user(id, { is_active: false }).catch(() => null)));
    this.selection.set(new Set());
    this.load_users();
  }
}
