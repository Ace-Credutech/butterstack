import { Component, inject, input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { DocumentsService } from '../../../services/documents.service';
import { WsService }        from '../../../services/ws.service';
import type { DocumentItem, DocumentEntityType, DocumentContent } from '../../../services/documents.service';

const PAGE_SIZES = [10, 20, 50, 100];

const format_bytes = (bytes: number): string => {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

const mime_label = (mime: string): string => {
  if (mime.includes('pdf'))                                        return 'PDF';
  if (mime.includes('word') || mime.includes('docx'))              return 'DOCX';
  if (mime.includes('sheet') || mime.includes('xlsx'))             return 'XLSX';
  if (mime.includes('csv'))                                        return 'CSV';
  if (mime.includes('png'))                                        return 'PNG';
  if (mime.includes('jpeg') || mime.includes('jpg'))               return 'JPG';
  if (mime.includes('image'))                                      return 'IMG';
  if (mime.startsWith('text/plain'))                               return 'TXT';
  if (mime.includes('json'))                                       return 'JSON';
  if (mime.includes('markdown') || mime.includes('md'))            return 'MD';
  return mime.split('/')[1]?.toUpperCase().slice(0, 6) ?? 'FILE';
};

const purpose_label = (p: string): string =>
  ({ requirement: 'Requirement', design: 'Design', technical_spec: 'Tech Spec', meeting_notes: 'Meeting Notes',
     wireframe: 'Wireframe', user_research: 'Research', competitive_analysis: 'Competitive', reference: 'Reference', other: 'Other' })[p] ?? p;

@Component({
  selector:    'bs-documents-panel',
  templateUrl: './documents-panel.html',
})
export class DocumentsPanel implements OnInit, OnDestroy {
  private readonly docs_svc = inject(DocumentsService);
  private readonly ws       = inject(WsService);
  private ws_unsub: (() => void) | null = null;

  readonly entity_type = input.required<DocumentEntityType>();
  readonly entity_id   = input.required<string>();

  readonly loading   = signal(false);
  readonly uploading = signal(false);
  readonly documents = signal<DocumentItem[]>([]);
  readonly error     = signal<string | null>(null);

  readonly page       = signal(1);
  readonly page_size  = signal(20);
  readonly total      = signal(0);
  readonly total_pages = computed(() => Math.ceil(this.total() / this.page_size()) || 1);

  readonly viewed_doc     = signal<DocumentItem | null>(null);
  readonly content        = signal<DocumentContent | null>(null);
  readonly content_loading = signal(false);
  readonly content_error  = signal<string | null>(null);

  readonly page_sizes   = PAGE_SIZES;
  readonly format_bytes = format_bytes;
  readonly mime_label   = mime_label;
  readonly purpose_label = purpose_label;

  readonly page_numbers = computed(() => {
    const tp = this.total_pages();
    const p  = this.page();
    if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (p > 3)         pages.push('...');
    for (let i = Math.max(2, p - 1); i <= Math.min(tp - 1, p + 1); i++) pages.push(i);
    if (p < tp - 2)    pages.push('...');
    pages.push(tp);
    return pages;
  });

  ngOnInit() {
    this.load();
    this.ws_unsub = this.ws.on<any>('document.parsed', (event) => this.on_document_parsed(event.payload));
  }

  ngOnDestroy() { this.ws_unsub?.(); }

  private on_document_parsed(payload: any) {
    if (!payload?.document_id) return;
    this.documents.update(list =>
      list.map(doc =>
        doc.id === payload.document_id
          ? { ...doc, parse_status: payload.parse_status, ai_name: payload.ai_name ?? doc.ai_name, ai_summary: payload.ai_summary ?? doc.ai_summary }
          : doc,
      ),
    );
  }

  async load() {
    try {
      this.loading.set(true);
      this.error.set(null);
      const res = await this.docs_svc.list(this.entity_type(), this.entity_id(), { page: this.page(), page_size: this.page_size() });
      this.documents.set(res.data.items);
      this.total.set(res.data.total);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load documents');
    } finally {
      this.loading.set(false);
    }
  }

  go_to_page(p: number | '...') {
    if (p === '...' || p === this.page()) return;
    this.page.set(p as number);
    this.load();
  }

  change_page_size(size: number) {
    this.page_size.set(size);
    this.page.set(1);
    this.load();
  }

  trigger_upload() {
    document.getElementById(`doc-upload-${this.entity_id()}`)?.click();
  }

  async on_file_selected(event: Event) {
    try {
      const input = event.target as HTMLInputElement;
      const file  = input.files?.[0];
      if (!file) return;
      input.value = '';
      this.uploading.set(true);
      this.error.set(null);
      const res = await this.docs_svc.upload(this.entity_type(), this.entity_id(), file);
      this.total.update(n => n + 1);
      if (this.page() === 1) this.documents.update(list => [res.data, ...list.slice(0, this.page_size() - 1)]);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Upload failed');
    } finally {
      this.uploading.set(false);
    }
  }

  async view_content(doc: DocumentItem) {
    try {
      this.viewed_doc.set(doc);
      this.content.set(null);
      this.content_error.set(null);
      this.content_loading.set(true);
      const res = await this.docs_svc.get_content(doc.id);
      this.content.set(res.data);
    } catch (e: any) {
      this.content_error.set(e?.message ?? 'Failed to load content');
    } finally {
      this.content_loading.set(false);
    }
  }

  close_content() {
    this.viewed_doc.set(null);
    this.content.set(null);
  }

  async download(doc: DocumentItem) {
    try {
      const res = await this.docs_svc.get_url(doc.id);
      window.open(res.data.url, '_blank');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to get download link');
    }
  }

  async remove(doc: DocumentItem) {
    try {
      await this.docs_svc.delete(doc.id);
      this.documents.update(list => list.filter(d => d.id !== doc.id));
      this.total.update(n => Math.max(0, n - 1));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to delete document');
    }
  }
}
