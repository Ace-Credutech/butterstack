import { inject, Injectable } from '@angular/core';
import { HttpService } from './http.service';

export type AdminUser = {
  id:         string;
  email:      string;
  name:       string;
  is_active:  boolean;
  role:       { id: string; slug: string; name: string } | null;
  created_at: string;
};

export type AdminRole = {
  id:          string;
  slug:        string;
  name:        string;
  description: string | null;
  permissions: Record<string, unknown>;
  is_system:   boolean;
  user_count:  number;
  created_at:  string;
  updated_at:  string;
};

export type ListUsersParams = {
  q?:        string;
  role_slug?: string;
  is_active?: 'true' | 'false';
  sort?:     'created_at' | 'name' | 'email';
  dir?:      'asc' | 'desc';
  page?:     number;
  size?:     number;
};

export type ListUsersResponse = { code: number; message: string; data: { items: AdminUser[]; total: number; page: number; size: number } };
export type ListRolesResponse = { code: number; message: string; data: { items: AdminRole[] } };
export type UpdateUserBody    = { role_slug?: string; is_active?: boolean };
export type UpdateRoleBody    = { name?: string; description?: string; permissions?: Record<string, unknown> };

export type BulkUpsertOp = {
  email:       string;
  role_slug?:  string;
  is_active?:  boolean;
  name?:       string;
  first_name?: string;
  last_name?:  string;
  password?:   string;
};

export type BulkUpsertResponse = {
  code:    number;
  message: string;
  data: {
    success:  number;
    updated:  number;
    created:  number;
    failed:   { email: string; error: string }[];
  };
};

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpService);

  list_users(params: ListUsersParams) {
    return this.http.get<ListUsersResponse>('/admin/users', params as any);
  }

  update_user(id: string, body: UpdateUserBody) {
    return this.http.patch<{ code: number; message: string; data: AdminUser }>(`/admin/users/${id}`, body);
  }

  list_roles() {
    return this.http.get<ListRolesResponse>('/admin/roles');
  }

  update_role(id: string, body: UpdateRoleBody) {
    return this.http.patch<{ code: number; message: string; data: AdminRole }>(`/admin/roles/${id}`, body);
  }

  create_role(body: { slug: string; name: string; description?: string; permissions: Record<string, unknown> }) {
    return this.http.post<{ code: number; message: string; data: AdminRole }>(`/admin/roles`, body);
  }

  bulk_upsert_users(updates: BulkUpsertOp[]) {
    return this.http.post<BulkUpsertResponse>(`/admin/users/bulk`, { updates });
  }

  list_users_full(params: ListUsersParams) {
    return this.http.get<ListUsersResponse>('/admin/users', { ...params, size: 1000 } as any);
  }
}
