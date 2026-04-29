import { Component, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Header } from '../../components/organisms/header/header';
import { Button } from '../../components/atoms/button/button';
import { ErrorAlert } from '../../components/atoms/error-alert/error-alert';
import { FormField } from '../../components/molecules/form-field/form-field';
import { Textarea } from '../../components/atoms/textarea/textarea';
import { Label } from '../../components/atoms/label/label';
import { DocumentsPanel } from '../../components/organisms/documents-panel/documents-panel';
import { ProjectsService, ProjectStatus, StepStatus } from '../../services/projects.service';
import { WsService } from '../../services/ws.service';
import type { DocumentPurpose } from '../../services/documents.service';

interface StepDef { number: number; title: string; subtitle: string }

const STEPS: StepDef[] = [
  { number: 1, title: 'Brief',          subtitle: 'Name + one-line goal'        },
  { number: 2, title: 'Documents',      subtitle: 'BRDs, mocks, references'     },
  { number: 3, title: 'Roles',          subtitle: 'Personas in your app'        },
  { number: 4, title: 'AI Clarification', subtitle: 'Multi-participant chat'    },
  { number: 5, title: 'Members',        subtitle: 'Stakeholders building it'    },
  { number: 6, title: 'Module Skeleton', subtitle: 'AI-proposed structure'      },
];

const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 64);

const DOC_PURPOSES: { value: DocumentPurpose; label: string }[] = [
  { value: 'requirement',          label: 'Requirement'    },
  { value: 'design',               label: 'Design'         },
  { value: 'technical_spec',       label: 'Tech Spec'      },
  { value: 'meeting_notes',        label: 'Meeting Notes'  },
  { value: 'wireframe',            label: 'Wireframe'      },
  { value: 'user_research',        label: 'Research'       },
  { value: 'competitive_analysis', label: 'Competitive'    },
  { value: 'reference',            label: 'Reference'      },
  { value: 'other',                label: 'Other'          },
];

@Component({
  selector:    'bs-project-create-wizard',
  imports:     [FormsModule, Header, Button, ErrorAlert, FormField, Textarea, Label, DocumentsPanel],
  templateUrl: './project-create-wizard.html',
})
export class ProjectCreateWizard implements OnDestroy {
  private readonly projects = inject(ProjectsService);
  private readonly router   = inject(Router);
  private readonly route    = inject(ActivatedRoute);
  private readonly ws       = inject(WsService);

  private ws_unsub_ctx: (() => void) | null = null;

  readonly docs_panel = viewChild<DocumentsPanel>('docsPanel');

  readonly steps          = STEPS;
  readonly doc_purposes   = DOC_PURPOSES;
  readonly project_id     = signal<string | null>(null);
  readonly project_name   = signal<string | null>(null);
  readonly project_status = signal<ProjectStatus | null>(null);
  readonly active_step    = signal<number>(1);
  readonly step_statuses  = signal<Map<number, StepStatus>>(new Map());
  readonly loading        = signal(false);
  readonly error          = signal<string | null>(null);

  readonly name           = signal('');
  readonly slug           = signal('');
  readonly brief          = signal('');
  readonly slug_dirty     = signal(false);

  readonly paste_title    = signal('');
  readonly paste_content  = signal('');
  readonly paste_purpose  = signal<DocumentPurpose>('requirement');
  readonly pasting        = signal(false);
  readonly paste_error    = signal<string | null>(null);
  readonly step2_loading  = signal(false);

  readonly initial_ctx_status   = signal<'idle' | 'checking' | 'building' | 'ready' | 'failed'>('idle');
  readonly initial_ctx_markdown = signal<string | null>(null);
  readonly initial_ctx_error    = signal<string | null>(null);

  readonly active_step_def = computed(() => this.steps.find(s => s.number === this.active_step()) ?? this.steps[0]);

  constructor() { void this.bootstrap(); }

  private async bootstrap(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.project_id.set(id);
    await this.refresh_init_state();
    const requested = Number(this.route.snapshot.queryParamMap.get('step') ?? '1');
    if (Number.isFinite(requested) && requested >= 1 && requested <= 6) this.active_step.set(requested);
  }

  private async refresh_init_state(): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    try {
      const res = await this.projects.get_init_state(id);
      const map = new Map<number, StepStatus>();
      for (const s of res.data.steps) map.set(s.step, s.status);
      this.step_statuses.set(map);
      this.project_name.set(res.data.project_name);
      this.project_status.set(res.data.project_status);
      if (map.get(2) === 'done') void this.load_initial_ctx(id);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load init state');
    }
  }

  on_name_change(value: string): void {
    this.name.set(value);
    if (!this.slug_dirty()) this.slug.set(slugify(value));
  }

  on_slug_change(value: string): void {
    this.slug_dirty.set(true);
    this.slug.set(value);
  }

  status_for(step: number): StepStatus { return this.step_statuses().get(step) ?? null; }

  step_classes(step: number): string {
    const is_active = step === this.active_step();
    const status    = this.status_for(step);
    if (is_active)            return 'border-green-600 bg-green-50';
    if (status === 'done')    return 'border-green-200 bg-white';
    if (status === 'stale')   return 'border-amber-300 bg-amber-50';
    return 'border-gray-200 bg-white';
  }

  step_badge(step: number): string {
    const status = this.status_for(step);
    if (status === 'done')  return 'Done';
    if (status === 'stale') return 'Stale';
    if (status === 'in-progress') return 'In progress';
    return '';
  }

  can_submit_step1(): boolean {
    return !this.loading() && this.name().trim().length >= 1 && this.slug().trim().length >= 1;
  }

  async submit_step1(): Promise<void> {
    if (!this.can_submit_step1()) return;
    this.error.set(null);
    this.loading.set(true);
    try {
      const created = await this.create_or_skip();
      await this.mark_step1_done(created.project_id);
      await this.navigate_to_step2(created.project_id);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to save brief');
    } finally {
      this.loading.set(false);
    }
  }

  private async create_or_skip(): Promise<{ project_id: string }> {
    const existing = this.project_id();
    if (existing) return { project_id: existing };
    const created = await this.projects.create_project({ name: this.name(), slug: this.slug(), brief: this.brief() || undefined });
    this.project_id.set(created.project_id);
    return { project_id: created.project_id };
  }

  private async mark_step1_done(project_id: string): Promise<void> {
    await this.projects.mark_step(project_id, 1, 'done');
    const next = new Map(this.step_statuses());
    next.set(1, 'done');
    this.step_statuses.set(next);
  }

  private async navigate_to_step2(project_id: string): Promise<void> {
    this.active_step.set(2);
    await this.router.navigate(['/app/projects', project_id, 'wizard'], { queryParams: { step: 2 } });
  }

  jump_to_step(step: number): void {
    if (!this.project_id()) return;
    this.active_step.set(step);
    void this.router.navigate(['/app/projects', this.project_id(), 'wizard'], { queryParams: { step }, replaceUrl: true });
  }

  can_save_paste(): boolean {
    return !this.pasting()
      && this.paste_title().trim().length >= 1
      && this.paste_content().trim().length >= 1;
  }

  async save_paste(): Promise<void> {
    const id = this.project_id();
    if (!id || !this.can_save_paste()) return;
    this.paste_error.set(null);
    this.pasting.set(true);
    try {
      await this.projects.paste_document(id, {
        title:   this.paste_title().trim(),
        content: this.paste_content(),
        purpose: this.paste_purpose(),
      });
      this.paste_title.set('');
      this.paste_content.set('');
      this.paste_purpose.set('requirement');
      void this.docs_panel()?.load();
    } catch (e: any) {
      this.paste_error.set(e?.message ?? 'Failed to save pasted content');
    } finally {
      this.pasting.set(false);
    }
  }

  async continue_to_step3(): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    this.error.set(null);
    this.step2_loading.set(true);
    try {
      await this.projects.mark_step(id, 2, 'done');
      const next = new Map(this.step_statuses());
      next.set(2, 'done');
      this.step_statuses.set(next);
      await this.load_initial_ctx(id);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to mark step 2 done');
    } finally {
      this.step2_loading.set(false);
    }
  }

  async proceed_to_step3(): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    this.active_step.set(3);
    await this.router.navigate(['/app/projects', id, 'wizard'], { queryParams: { step: 3 } });
  }

  private async load_initial_ctx(project_id: string): Promise<void> {
    this.initial_ctx_status.set('checking');
    this.ws_unsub_ctx?.();
    this.ws_unsub_ctx = this.ws.on<{ project_id: string; status: string; error_message: string | null }>(
      'project.initial-context.status',
      (event) => {
        if (event.payload?.project_id !== project_id) return;
        const s = event.payload.status;
        if (s === 'ready')    void this.fetch_initial_ctx(project_id);
        else if (s === 'failed')   { this.initial_ctx_status.set('failed');   this.initial_ctx_error.set(event.payload.error_message ?? 'Build failed'); }
        else if (s === 'building') this.initial_ctx_status.set('building');
      },
    );
    await this.fetch_initial_ctx(project_id);
  }

  private async fetch_initial_ctx(project_id: string): Promise<void> {
    try {
      const res = await this.projects.get_initial_context(project_id);
      const { status, markdown_text, error_message } = res.data;
      if (status === 'ready' && markdown_text) {
        this.initial_ctx_markdown.set(markdown_text);
        this.initial_ctx_status.set('ready');
        this.ws_unsub_ctx?.();
        this.ws_unsub_ctx = null;
      } else if (status === 'failed') {
        this.initial_ctx_status.set('failed');
        this.initial_ctx_error.set(error_message ?? 'Build failed');
      } else {
        this.initial_ctx_status.set('building');
      }
    } catch (e: any) {
      this.initial_ctx_status.set('failed');
      this.initial_ctx_error.set(e?.message ?? 'Failed to load initial context');
    }
  }

  ngOnDestroy(): void {
    this.ws_unsub_ctx?.();
  }
}
