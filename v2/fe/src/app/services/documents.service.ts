import { inject, Injectable } from '@angular/core';
import { HttpService } from './http.service';

export type DocumentEntityType = 'org' | 'project' | 'user' | 'conversation';
export type DocumentPurpose    = 'requirement' | 'design' | 'technical_spec' | 'meeting_notes' | 'wireframe' | 'user_research' | 'competitive_analysis' | 'reference' | 'other';
export type ParseStatus        = 'pending' | 'parsed' | 'failed';

export interface DocumentUploader { id: string; name: string; email: string }

export interface DocumentItem {
  id:           string;
  filename:     string;
  mime_type:    string;
  size_bytes:   number;
  kind:         string;
  purpose:      DocumentPurpose;
  parse_status: ParseStatus;
  parse_error:  string | null;
  ai_name:      string | null;
  ai_summary:   string | null;
  keywords:     string[];
  entity_type:  DocumentEntityType | null;
  entity_id:    string | null;
  uploaded_by:  DocumentUploader | null;
  scope_label:  string | null;
  created_at:   string;
}

export interface DocumentPassage {
  id:       string;
  idx:      number;
  type:     string;
  heading:  string | null;
  text:     string;
  keywords: string[];
}

export interface DocumentEntity {
  id:   string;
  name: string;
  type: string;
}

export interface DocumentContent {
  document: DocumentItem;
  passages: DocumentPassage[];
  entities: DocumentEntity[];
}

export interface PromptRunItem {
  id:            string;
  prompt_slug:   string | null;
  prompt_name:   string | null;
  model:         string;
  status:        string;
  tokens_in:     number | null;
  tokens_out:    number | null;
  latency_ms:    number | null;
  input_payload: { system_text?: string; variables?: Record<string, unknown>; user_message?: string } | null;
  output_text:   string | null;
  output_parsed: unknown | null;
  error_message: string | null;
  created_at:    string;
}

export interface ListDocumentsParams {
  page?:      number;
  page_size?: number;
}

export interface ListAllDocumentsParams extends ListDocumentsParams {
  entity_type?: DocumentEntityType;
}

export interface ListDocumentsData {
  items:       DocumentItem[];
  total:       number;
  page:        number;
  page_size:   number;
  total_pages: number;
}

export interface ListDocumentsResponse  { code: number; message: string; data: ListDocumentsData }
export interface UploadDocumentResponse { code: number; message: string; data: DocumentItem }
export interface DeleteDocumentResponse { code: number; message: string; data: { id: string } }
export interface GetDocumentUrlResponse { code: number; message: string; data: { url: string; expires_in: number } }
export interface GetDocumentContentResponse { code: number; message: string; data: DocumentContent }
export interface GetDocumentRunsResponse   { code: number; message: string; data: { items: PromptRunItem[] } }

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly http = inject(HttpService);

  list(entity_type: DocumentEntityType, entity_id: string, params: ListDocumentsParams = {}): Promise<ListDocumentsResponse> {
    const qs = new URLSearchParams({ entity_type, entity_id });
    if (params.page)      qs.set('page',      String(params.page));
    if (params.page_size) qs.set('page_size', String(params.page_size));
    return this.http.get<ListDocumentsResponse>(`/documents?${qs}`);
  }

  list_all(org_id: string, params: ListAllDocumentsParams = {}): Promise<ListDocumentsResponse> {
    const qs = new URLSearchParams({ org_id });
    if (params.entity_type) qs.set('entity_type', params.entity_type);
    if (params.page)        qs.set('page',        String(params.page));
    if (params.page_size)   qs.set('page_size',   String(params.page_size));
    return this.http.get<ListDocumentsResponse>(`/documents/all?${qs}`);
  }

  get_runs(id: string): Promise<GetDocumentRunsResponse> {
    return this.http.get<GetDocumentRunsResponse>(`/documents/${id}/runs`);
  }

  upload(entity_type: DocumentEntityType, entity_id: string, file: File, purpose: DocumentPurpose = 'other'): Promise<UploadDocumentResponse> {
    const form = new FormData();
    form.append('file',        file);
    form.append('entity_type', entity_type);
    form.append('entity_id',   entity_id);
    form.append('purpose',     purpose);
    return this.http.post_form<UploadDocumentResponse>('/documents/upload', form);
  }

  get_content(id: string): Promise<GetDocumentContentResponse> {
    return this.http.get<GetDocumentContentResponse>(`/documents/${id}/content`);
  }

  delete(id: string): Promise<DeleteDocumentResponse> {
    return this.http.delete<DeleteDocumentResponse>(`/documents/${id}`);
  }

  get_url(id: string): Promise<GetDocumentUrlResponse> {
    return this.http.get<GetDocumentUrlResponse>(`/documents/${id}/url`);
  }

  reparse(id: string): Promise<{ code: number; message: string; data: { document_id: string; parse_status: string } }> {
    return this.http.post<{ code: number; message: string; data: { document_id: string; parse_status: string } }>(`/documents/${id}/reparse`, {});
  }
}
