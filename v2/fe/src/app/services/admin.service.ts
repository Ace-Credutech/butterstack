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

export type PromptModel          = 'claude-opus-4-7' | 'claude-sonnet-4-6' | 'claude-haiku-4-5' | 'gpt-5' | 'gpt-5-mini' | 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4.1-nano';
export type PromptResponseFormat = 'text' | 'json' | 'json_schema';

export type PromptVersionSummary = {
  id:              string;
  version:         number;
  model:           PromptModel;
  temperature:     number;
  max_tokens:      number;
  response_format: PromptResponseFormat;
};

export type PromptVersionFull = PromptVersionSummary & {
  status:        string;
  system_text:   string;
  user_template: string;
  notes:         string | null;
  created_at:    string;
};

export type AdminPrompt = {
  id:          string;
  slug:        string;
  name:        string;
  description: string | null;
  category:    string;
  status:      string;
  version:     PromptVersionSummary | null;
};

export type AdminPromptFull = Omit<AdminPrompt, 'version'> & { version: PromptVersionFull | null };

export type UpdatePromptBody = {
  model?:           PromptModel;
  temperature?:     number;
  max_tokens?:      number;
  response_format?: PromptResponseFormat;
  system_text?:     string;
  user_template?:   string;
  notes?:           string;
};

export type ListPromptsResponse  = { code: number; message: string; data: { items: AdminPrompt[] } };
export type GetPromptResponse    = { code: number; message: string; data: AdminPromptFull };
export type UpdatePromptResponse = { code: number; message: string; data: PromptVersionFull };

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

  list_prompts() {
    return this.http.get<ListPromptsResponse>('/admin/prompts');
  }

  get_prompt(id: string) {
    return this.http.get<GetPromptResponse>(`/admin/prompts/${id}`);
  }

  update_prompt(id: string, body: UpdatePromptBody) {
    return this.http.put<UpdatePromptResponse>(`/admin/prompts/${id}`, body);
  }
}
