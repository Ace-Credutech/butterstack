import { Component, inject, input, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { DocumentsService } from '../../../services/documents.service';
import { WsService }        from '../../../services/ws.service';
import type { DocumentItem, DocumentEntityType, DocumentContent, PromptRunItem } from '../../../services/documents.service';

type ScopeFilter = 'all' | 'org' | 'user';
type SlideTab    = 'summary' | 'keywords' | 'entities' | 'passages' | 'runs';

const PAGE_SIZES = [10, 20, 50, 100];

const format_bytes = (bytes: number): string => {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

const mime_label = (mime: string): string => {
  if (mime.includes('pdf'))                                       return 'PDF';
  if (mime.includes('word') || mime.includes('docx'))             return 'DOCX';
  if (mime.includes('sheet') || mime.includes('xlsx'))            return 'XLSX';
  if (mime.includes('csv'))                                       return 'CSV';
  if (mime.includes('png'))                                       return 'PNG';
  if (mime.includes('jpeg') || mime.includes('jpg'))              return 'JPG';
  if (mime.includes('image'))                                     return 'IMG';
  if (mime.includes('markdown') || mime.endsWith('/md'))          return 'MD';
  if (mime.startsWith('text/plain'))                              return 'TXT';
  if (mime.includes('json'))                                      return 'JSON';
  return mime.split('/')[1]?.toUpperCase().slice(0, 6) ?? 'FILE';
};

const purpose_label = (p: string): string =>
  ({ requirement: 'Requirement', design: 'Design', technical_spec: 'Tech Spec',
     meeting_notes: 'Meeting Notes', wireframe: 'Wireframe', user_research: 'Research',
     competitive_analysis: 'Competitive', reference: 'Reference', other: 'Other' })[p] ?? p;

const format_ms = (ms: number | null): string => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

@Component({
  selector:    'bs-documents-panel',
  templateUrl: './documents-panel.html',
  imports:     [DatePipe, JsonPipe],
})
export class DocumentsPanel implements OnInit, OnDestroy {
  private readonly docs_svc = inject(DocumentsService);
  private readonly ws       = inject(WsService);
  private ws_unsub: (() => void) | null = null;

  // Scoped mode (entity_type + entity_id) — used when embedded in project/user context
  readonly entity_type = input<DocumentEntityType | null>(null);
  readonly entity_id   = input<string | null>(null);

  // Org-wide mode — used on the Documents page
  readonly org_id  = input<string | null>(null);
  readonly user_id = input<string | null>(null);

  readonly is_org_mode = computed(() => !!this.org_id());

  readonly scope_filter = signal<ScopeFilter>('all');

  readonly loading   = signal(false);
  readonly uploading = signal(false);
  readonly documents = signal<DocumentItem[]>([]);
  readonly error     = signal<string | null>(null);

  readonly search      = signal('');
  private search_timer: ReturnType<typeof setTimeout> | null = null;

  readonly page        = signal(1);
  readonly page_size   = signal(20);
  readonly total       = signal(0);
  readonly total_pages = computed(() => Math.ceil(this.total() / this.page_size()) || 1);

  readonly viewed_doc      = signal<DocumentItem | null>(null);
  readonly slide_tab       = signal<SlideTab>('summary');
  readonly content         = signal<DocumentContent | null>(null);
  readonly content_loading = signal(false);
  readonly content_error   = signal<string | null>(null);
  readonly runs            = signal<PromptRunItem[]>([]);
  readonly runs_loading    = signal(false);
  readonly runs_error      = signal<string | null>(null);
  readonly expanded_run    = signal<string | null>(null);
  readonly reparsing       = signal(false);
  readonly cancelling      = signal(false);

  readonly total_tokens = computed(() => {
    const list = this.runs();
    if (!list.length) return null;
    return list.reduce((sum, r) => sum + (r.tokens_in ?? 0) + (r.tokens_out ?? 0), 0);
  });

  readonly grouped_passages = computed(() => {
    const passages = this.content()?.passages ?? [];
    const groups: { key: string; type: string; heading: string | null; texts: string[] }[] = [];
    for (const p of passages) {
      const key = `${p.type}::${p.heading ?? ''}`;
      const existing = groups.find(g => g.key === key);
      if (existing) existing.texts.push(p.text);
      else groups.push({ key, type: p.type, heading: p.heading, texts: [p.text] });
    }
    return groups;
  });

  readonly page_sizes    = PAGE_SIZES;
  readonly scope_filters: [ScopeFilter, string][] = [['all','All'],['org','Organization'],['user','My Docs']];
  readonly format_bytes  = format_bytes;
  readonly mime_label    = mime_label;
  readonly purpose_label = purpose_label;
  readonly format_ms     = format_ms;

  readonly page_numbers = computed(() => {
    const tp = this.total_pages();
    const p  = this.page();
    if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (p > 3)      pages.push('...');
    for (let i = Math.max(2, p - 1); i <= Math.min(tp - 1, p + 1); i++) pages.push(i);
    if (p < tp - 2) pages.push('...');
    pages.push(tp);
    return pages;
  });

  constructor() {
    effect(() => {
      this.scope_filter();
      this.page.set(1);
    });
  }

  private ws_unsub_run_started:   (() => void) | null = null;
  private ws_unsub_run_completed: (() => void) | null = null;

  ngOnInit() {
    this.load();
    this.ws_unsub               = this.ws.on<any>('document.parsed',  (e) => this.on_document_parsed(e.payload));
    this.ws_unsub_run_started   = this.ws.on<any>('run.started',      (e) => this.on_run_started(e.payload));
    this.ws_unsub_run_completed = this.ws.on<any>('run.completed',    (e) => this.on_run_completed(e.payload));
  }

  ngOnDestroy() {
    this.ws_unsub?.();
    this.ws_unsub_run_started?.();
    this.ws_unsub_run_completed?.();
    if (this.search_timer) clearTimeout(this.search_timer);
  }

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

  private on_run_started(payload: any) {
    if (!payload?.run_id || !payload?.scope_id) return;
    if (this.viewed_doc()?.id !== payload.scope_id) return;
    const pending_run: PromptRunItem = {
      id:            payload.run_id,
      prompt_slug:   payload.prompt_slug   ?? null,
      prompt_name:   null,
      model:         payload.model,
      status:        'pending',
      tokens_in:     null,
      tokens_out:    null,
      latency_ms:    null,
      input_payload: payload.input_payload ?? null,
      output_text:   null,
      output_parsed: null,
      error_message: null,
      created_at:    payload.created_at,
    };
    this.runs.update(list => [pending_run, ...list.filter(r => r.id !== payload.run_id)]);
  }

  private on_run_completed(payload: any) {
    if (!payload?.run_id || !payload?.scope_id) return;
    if (this.viewed_doc()?.id !== payload.scope_id) return;
    this.runs.update(list =>
      list.map(r => r.id !== payload.run_id ? r : {
        ...r,
        status:        payload.status,
        tokens_in:     payload.tokens_in    ?? null,
        tokens_out:    payload.tokens_out   ?? null,
        latency_ms:    payload.latency_ms   ?? null,
        output_text:   payload.output_text  ?? null,
        error_message: payload.error_message ?? null,
      }),
    );
  }

  set_search(value: string) {
    this.search.set(value);
    if (this.search_timer) clearTimeout(this.search_timer);
    this.search_timer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 400);
  }

  async load() {
    try {
      this.loading.set(true);
      this.error.set(null);
      const search = this.search().trim() || undefined;
      const params = { page: this.page(), page_size: this.page_size(), search };

      let res;
      if (this.is_org_mode()) {
        const filter = this.scope_filter();
        res = await this.docs_svc.list_all(this.org_id()!, {
          ...params,
          entity_type: filter === 'all' ? undefined : filter as 'org' | 'user',
        });
      } else {
        res = await this.docs_svc.list(this.entity_type()!, this.entity_id()!, params);
      }
      this.documents.set(res.data.items);
      this.total.set(res.data.total);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load documents');
    } finally {
      this.loading.set(false);
    }
  }

  set_scope_filter(f: ScopeFilter) {
    this.scope_filter.set(f);
    this.load();
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
    const id = this.is_org_mode() ? this.org_id() : this.entity_id();
    document.getElementById(`doc-upload-${id}`)?.click();
  }

  async on_file_selected(event: Event) {
    try {
      const input = event.target as HTMLInputElement;
      const file  = input.files?.[0];
      if (!file) return;
      input.value = '';
      this.uploading.set(true);
      this.error.set(null);

      const et = this.is_org_mode() ? 'org'          : this.entity_type()!;
      const ei = this.is_org_mode() ? this.org_id()! : this.entity_id()!;
      const res = await this.docs_svc.upload(et as DocumentEntityType, ei, file);
      this.total.update(n => n + 1);
      if (this.page() === 1) this.documents.update(list => [res.data, ...list.slice(0, this.page_size() - 1)]);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Upload failed');
    } finally {
      this.uploading.set(false);
    }
  }

  async view_content(doc: DocumentItem) {
    this.viewed_doc.set(doc);
    this.slide_tab.set('summary');
    this.content.set(null);
    this.content_error.set(null);
    this.runs.set([]);
    this.expanded_run.set(null);
    if (doc.parse_status !== 'parsed') return;
    this.content_loading.set(true);
    try {
      const res = await this.docs_svc.get_content(doc.id);
      this.content.set(res.data);
    } catch (e: any) {
      this.content_error.set(e?.message ?? 'Failed to load content');
    } finally {
      this.content_loading.set(false);
    }
  }

  async switch_tab(tab: SlideTab) {
    this.slide_tab.set(tab);
    if (tab === 'runs' && this.runs().length === 0 && !this.runs_loading()) {
      await this.load_runs();
    }
  }

  readonly slide_tabs: [SlideTab, string][] = [
    ['summary',  'Summary'],
    ['keywords', 'Keywords'],
    ['entities', 'Entities'],
    ['passages', 'Passages'],
    ['runs',     'AI Calls'],
  ];

  private async load_runs() {
    const doc = this.viewed_doc();
    if (!doc) return;
    try {
      this.runs_loading.set(true);
      this.runs_error.set(null);
      const res = await this.docs_svc.get_runs(doc.id);
      const api_items = res.data.items as PromptRunItem[];
      const api_ids   = new Set(api_items.map(r => r.id));
      // Preserve pending runs received via WS that aren't in the API result yet
      this.runs.update(current => {
        const ws_pending = current.filter(r => r.status === 'pending' && !api_ids.has(r.id));
        return [...ws_pending, ...api_items];
      });
    } catch (e: any) {
      this.runs_error.set(e?.message ?? 'Failed to load AI calls');
    } finally {
      this.runs_loading.set(false);
    }
  }

  close_content() {
    this.viewed_doc.set(null);
    this.slide_tab.set('summary');
    this.content.set(null);
    this.runs.set([]);
    this.expanded_run.set(null);
  }

  toggle_run(id: string) {
    this.expanded_run.update(cur => cur === id ? null : id);
  }

  async reparse(doc: DocumentItem) {
    try {
      this.reparsing.set(true);
      await this.docs_svc.reparse(doc.id);
      this.documents.update(list => list.map(d => d.id === doc.id ? { ...d, parse_status: 'pending' as const } : d));
      if (this.viewed_doc()?.id === doc.id) {
        this.viewed_doc.update(d => d ? { ...d, parse_status: 'pending' as const } : null);
        this.runs.set([]);
        this.content.set(null);
        this.slide_tab.set('summary');
      }
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to queue reparse');
    } finally {
      this.reparsing.set(false);
    }
  }

  async cancel_parse_run(doc: DocumentItem) {
    try {
      this.cancelling.set(true);
      await this.docs_svc.cancel_parse(doc.id);
      this.documents.update(list => list.map(d => d.id === doc.id ? { ...d, parse_status: 'cancelled' as const } : d));
      if (this.viewed_doc()?.id === doc.id) {
        this.viewed_doc.update(d => d ? { ...d, parse_status: 'cancelled' as const } : null);
        this.runs.update(list => list.map(r => r.status === 'pending' ? { ...r, status: 'cancelled', error_message: 'Cancelled by user' } : r));
      }
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to cancel parse');
    } finally {
      this.cancelling.set(false);
    }
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
