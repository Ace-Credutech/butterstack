import { inject, Injectable } from '@angular/core';
import { HttpService } from './http.service';

export type EventSource = 'user' | 'ai' | 'system';

export interface EventScope {
  project_id:  string;
  module_id?:  string;
  feature_id?: string;
  page_id?:    string;
  session_id?: string;
}

export interface PostEventBody<P = Record<string, unknown>> {
  type:             string;
  payload:          P;
  scope:            EventScope;
  source:           EventSource;
  idempotency_key:  string;
  event_version?:   number;
}

export interface PostEventResponse<D = any> {
  code:    number;
  message: string;
  data: {
    id:          string;
    sequence_no: number;
    applied_at:  string;
    state_delta: D;
    affected_entities?: Record<string, unknown>;
    trace_id:    string;
    idempotent?: boolean;
  };
}

export type StepStatus    = 'in-progress' | 'done' | 'stale' | null;
export type ProjectStatus = 'draft' | 'active' | 'archived';

export type InitialContextStatus = 'absent' | 'pending' | 'building' | 'ready' | 'failed';

export interface InitialContextResult {
  code:    number;
  message: string;
  data: {
    project_id:    string;
    status:        InitialContextStatus;
    json_payload:  unknown | null;
    markdown_text: string | null;
    generated_at:  string | null;
    prompt_run_id: string | null;
    error_message: string | null;
  };
}

export interface InitStateStep {
  step:       number;
  status:     StepStatus;
  updated_at: string | null;
}

export interface InitStateResponse {
  code:    number;
  message: string;
  data: {
    project_id:         string;
    project_name:       string;
    project_slug:       string;
    project_status:     ProjectStatus;
    steps:              InitStateStep[];
    skeleton_revisions: unknown[];
  };
}

export interface ProjectListItem {
  id:         string;
  name:       string;
  slug:       string;
  brief:      string | null;
  status:     ProjectStatus;
  created_at: string;
}

export interface ListProjectsResponse {
  code:    number;
  message: string;
  data: {
    items:       ProjectListItem[];
    next_cursor: string | null;
  };
}

export interface ProjectRoleItem {
  id:          string;
  project_id:  string;
  name:        string;
  description: string | null;
  created_at:  string;
  updated_at:  string;
}

export interface ListRolesResponse {
  code:    number;
  message: string;
  data: {
    project_id: string;
    items:      ProjectRoleItem[];
  };
}

export interface RbacMatrixCell {
  id:             string;
  role_id:        string;
  permission_key: string;
  feature_id:     string | null;
  allow:          boolean;
}

export type StakeholderRole = 'decider' | 'reviewer' | 'contributor' | 'observer';

export interface ProjectMemberItem {
  id:               string;
  project_id:       string;
  user_id:          string | null;
  email:            string;
  name:             string;
  designation:      string;
  stakeholder_role: StakeholderRole;
  authority_rank:   number;
  invited_by:       string | null;
  created_at:       string;
  updated_at:       string;
}

export interface ListMembersResponse {
  code:    number;
  message: string;
  data: {
    project_id: string;
    items:      ProjectMemberItem[];
  };
}

export interface RbacMatrixResponse {
  code:    number;
  message: string;
  data: {
    project_id:      string;
    roles:           { id: string; name: string }[];
    permission_keys: string[];
    cells:           RbacMatrixCell[];
  };
}

const make_uuid = (): string => crypto.randomUUID();

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpService);

  list(limit = 50, cursor?: string): Promise<ListProjectsResponse> {
    return this.http.get<ListProjectsResponse>('/projects', { limit, cursor });
  }

  get_init_state(project_id: string): Promise<InitStateResponse> {
    return this.http.get<InitStateResponse>(`/projects/${project_id}/init-state`);
  }

  post_event<P, D = any>(body: Omit<PostEventBody<P>, 'idempotency_key'> & { idempotency_key?: string }): Promise<PostEventResponse<D>> {
    const envelope: PostEventBody<P> = {
      ...body,
      source:          body.source        ?? 'user',
      event_version:   body.event_version ?? 1,
      idempotency_key: body.idempotency_key ?? make_uuid(),
    };
    return this.http.post<PostEventResponse<D>>('/events', envelope);
  }

  create_project(input: { name: string; slug: string; brief?: string }): Promise<{ project_id: string; response: PostEventResponse }> {
    const project_id = make_uuid();
    return this.post_event<{ name: string; slug: string; brief?: string }>({
      type:    'project.create',
      payload: { name: input.name, slug: input.slug, brief: input.brief },
      scope:   { project_id },
      source:  'user',
    }).then(response => ({ project_id, response }));
  }

  mark_step(project_id: string, step: number, status: 'in-progress' | 'done' | 'stale'): Promise<PostEventResponse> {
    return this.post_event({
      type:    'project.init.step',
      payload: { step, status },
      scope:   { project_id },
      source:  'user',
    });
  }

  paste_document(project_id: string, payload: { title: string; content: string; purpose?: string }): Promise<PostEventResponse<{ document: { id: string; kind: string; filename: string; size: number; link_id: string } }>> {
    return this.post_event<{ title: string; content: string; purpose?: string }, { document: { id: string; kind: string; filename: string; size: number; link_id: string } }>({
      type:    'project.document.paste',
      payload: { title: payload.title, content: payload.content, purpose: payload.purpose ?? 'other' },
      scope:   { project_id },
      source:  'user',
    });
  }

  get_initial_context(project_id: string): Promise<InitialContextResult> {
    return this.http.get<InitialContextResult>(`/projects/${project_id}/initial-context`);
  }

  list_roles(project_id: string): Promise<ListRolesResponse> {
    return this.http.get<ListRolesResponse>(`/projects/${project_id}/roles`);
  }

  get_rbac_matrix(project_id: string): Promise<RbacMatrixResponse> {
    return this.http.get<RbacMatrixResponse>(`/projects/${project_id}/rbac-matrix`);
  }

  create_role(project_id: string, payload: { name: string; description?: string }): Promise<PostEventResponse<{ role: ProjectRoleItem }>> {
    return this.post_event<{ name: string; description?: string }, { role: ProjectRoleItem }>({
      type:    'role.create',
      payload: { name: payload.name, description: payload.description },
      scope:   { project_id },
      source:  'user',
    });
  }

  update_role(project_id: string, role_id: string, patch: { name?: string; description?: string | null }): Promise<PostEventResponse<{ role: ProjectRoleItem }>> {
    return this.post_event<{ role_id: string; name?: string; description?: string | null }, { role: ProjectRoleItem }>({
      type:    'role.update',
      payload: { role_id, ...patch },
      scope:   { project_id },
      source:  'user',
    });
  }

  delete_role(project_id: string, role_id: string): Promise<PostEventResponse<{ role: { id: string; deleted: boolean } }>> {
    return this.post_event<{ role_id: string }, { role: { id: string; deleted: boolean } }>({
      type:    'role.delete',
      payload: { role_id },
      scope:   { project_id },
      source:  'user',
    });
  }

  set_role_permission(project_id: string, payload: { role_id: string; permission_key: string; allow: boolean; feature_id?: string | null }): Promise<PostEventResponse<{ role_permission: RbacMatrixCell }>> {
    return this.post_event<{ role_id: string; permission_key: string; feature_id?: string | null; allow: boolean }, { role_permission: RbacMatrixCell }>({
      type:    'role.permission.set',
      payload: { role_id: payload.role_id, permission_key: payload.permission_key, feature_id: payload.feature_id ?? null, allow: payload.allow },
      scope:   { project_id },
      source:  'user',
    });
  }

  unset_role_permission(project_id: string, payload: { role_id: string; permission_key: string; feature_id?: string | null }): Promise<PostEventResponse> {
    return this.post_event<{ role_id: string; permission_key: string; feature_id?: string | null }>({
      type:    'role.permission.unset',
      payload: { role_id: payload.role_id, permission_key: payload.permission_key, feature_id: payload.feature_id ?? null },
      scope:   { project_id },
      source:  'user',
    });
  }

  list_members(project_id: string): Promise<ListMembersResponse> {
    return this.http.get<ListMembersResponse>(`/projects/${project_id}/members`);
  }

  add_member(project_id: string, payload: { name: string; email: string; designation: string; stakeholder_role: StakeholderRole; authority_rank: number }): Promise<PostEventResponse<{ member: ProjectMemberItem }>> {
    return this.post_event<typeof payload, { member: ProjectMemberItem }>({
      type:    'member.add',
      payload,
      scope:   { project_id },
      source:  'user',
    });
  }

  update_member(project_id: string, member_id: string, patch: { name?: string; email?: string; designation?: string; stakeholder_role?: StakeholderRole; authority_rank?: number }): Promise<PostEventResponse<{ member: ProjectMemberItem }>> {
    return this.post_event<{ member_id: string } & typeof patch, { member: ProjectMemberItem }>({
      type:    'member.update',
      payload: { member_id, ...patch },
      scope:   { project_id },
      source:  'user',
    });
  }

  remove_member(project_id: string, member_id: string): Promise<PostEventResponse<{ member: { id: string; deleted: boolean } }>> {
    return this.post_event<{ member_id: string }, { member: { id: string; deleted: boolean } }>({
      type:    'member.remove',
      payload: { member_id },
      scope:   { project_id },
      source:  'user',
    });
  }
}
