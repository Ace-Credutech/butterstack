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
}
