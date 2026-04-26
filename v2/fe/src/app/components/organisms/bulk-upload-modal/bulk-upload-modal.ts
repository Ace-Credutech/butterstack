import { Component, inject, input, output, signal } from '@angular/core';
import { CsvService } from '../../../services/csv.service';
import { AdminService } from '../../../services/admin.service';
import { Button } from '../../atoms/button/button';
import { IconButton } from '../../atoms/icon-button/icon-button';
import { Chip } from '../../atoms/chip/chip';

type ParsedRow = {
  email:      string;
  role_slug?: string;
  is_active?: boolean;
  name?:      string;
  password?:  string;
  valid:      boolean;
  reason?:    string;
  source:    'csv' | 'existing';
};

const validate_email = (s: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

const parse_bool = (s: string): boolean | undefined => {
  if (s === '' || s === undefined) return undefined;
  const v = s.toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes')   return true;
  if (v === 'false' || v === '0' || v === 'no')   return false;
  return undefined;
};

const validate_row = (row: Record<string, string>, valid_role_slugs: Set<string>): ParsedRow => {
  const email      = (row['email'] ?? '').trim();
  const role_slug  = (row['role_slug'] ?? '').trim() || undefined;
  const name       = (row['name'] ?? '').trim() || undefined;
  const password   = (row['password'] ?? '').trim() || undefined;
  const active_raw = (row['is_active'] ?? '').trim();
  const is_active  = parse_bool(active_raw);

  const base: ParsedRow = { email, role_slug, is_active, name, password, valid: true, source: 'csv' };
  if (!validate_email(email))                          return { ...base, valid: false, reason: 'invalid email' };
  if (role_slug && !valid_role_slugs.has(role_slug))   return { ...base, valid: false, reason: `unknown role ${role_slug}` };
  if (active_raw !== '' && is_active === undefined)    return { ...base, valid: false, reason: 'is_active must be true/false' };
  if (!role_slug && is_active === undefined && !name)  return { ...base, valid: false, reason: 'no change specified' };
  return base;
};

@Component({
  selector:    'bs-bulk-upload-modal',
  imports:     [Button, IconButton, Chip],
  templateUrl: './bulk-upload-modal.html',
})
export class BulkUploadModal {
  private readonly csv   = inject(CsvService);
  private readonly admin = inject(AdminService);

  readonly open              = input(false);
  readonly valid_role_slugs  = input.required<string[]>();
  readonly closed            = output<void>();
  readonly applied           = output<{ success: number; updated: number; created: number; failed: number }>();

  readonly file_name  = signal<string>('');
  readonly rows       = signal<ParsedRow[]>([]);
  readonly submitting = signal(false);
  readonly loading    = signal(false);
  readonly error      = signal<string | null>(null);

  readonly valid_count    = () => this.rows().filter(r => r.valid).length;
  readonly invalid_count  = () => this.rows().filter(r => !r.valid).length;
  readonly created_count  = () => this.rows().filter(r => r.valid && r.source === 'csv').length;

  pick_file(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.file_name.set(file.name);
    this.error.set(null);
    file.text().then(text => this.parse_text(text)).catch(e => this.error.set(String(e?.message ?? e)));
  }

  private parse_text(text: string) {
    const parsed     = this.csv.parse(text);
    const role_set   = new Set(this.valid_role_slugs());
    const validated  = parsed.rows.map(r => validate_row(r, role_set));
    this.rows.set(validated);
  }

  async load_existing() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.admin.list_users_full({ size: 1000, page: 1, sort: 'created_at', dir: 'desc' });
      const role_set = new Set(this.valid_role_slugs());
      const rows: ParsedRow[] = res.data.items.map(u => validate_row({
        email:     u.email,
        role_slug: u.role?.slug ?? '',
        is_active: String(u.is_active),
        name:      u.name,
      } as any, role_set));
      for (const r of rows) r.source = 'existing';
      this.file_name.set(`Loaded ${rows.length} existing users`);
      this.rows.set(rows);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load users');
    } finally {
      this.loading.set(false);
    }
  }

  async submit() {
    const valid = this.rows().filter(r => r.valid).map(r => ({
      email:     r.email,
      role_slug: r.role_slug,
      is_active: r.is_active,
      name:      r.name,
      password:  r.password,
    }));
    if (valid.length === 0) { this.error.set('Nothing valid to apply.'); return; }
    this.submitting.set(true);
    try {
      const res = await this.admin.bulk_upsert_users(valid);
      this.applied.emit({ success: res.data.success, updated: res.data.updated, created: res.data.created, failed: res.data.failed.length });
      this.reset();
      this.closed.emit();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Bulk upsert failed');
    } finally {
      this.submitting.set(false);
    }
  }

  reset() {
    this.file_name.set('');
    this.rows.set([]);
    this.error.set(null);
  }

  on_close() { this.reset(); this.closed.emit(); }

  download_template() {
    const slugs = this.valid_role_slugs();
    const sample_role_a = slugs.find(s => s !== 'super_admin') ?? slugs[0] ?? 'member';
    const sample_role_b = slugs.find(s => s === 'member') ?? sample_role_a;
    const sample = [
      { email: 'jane.doe@example.com',  name: 'Jane Doe',  role_slug: sample_role_a, is_active: 'true',  password: ''             },
      { email: 'john.roe@example.com',  name: 'John Roe',  role_slug: sample_role_b, is_active: 'true',  password: 'TempPass#9'   },
      { email: 'disabled@example.com',  name: '',          role_slug: '',            is_active: 'false', password: ''             },
    ];
    this.csv.download(
      'users-bulk-template.csv',
      ['email', 'name', 'role_slug', 'is_active', 'password'],
      sample,
      r => [r.email, r.name, r.role_slug, r.is_active, r.password],
    );
  }
}
