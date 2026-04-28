import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Header }  from '../../components/organisms/header/header';
import { Button }  from '../../components/atoms/button/button';
import { Chip }          from '../../components/atoms/chip/chip';
import { AdminService, AdminPromptFull, PromptModel, PromptResponseFormat, UpdatePromptBody } from '../../services/admin.service';

const MODELS: PromptModel[] = ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'gpt-5', 'gpt-4.1'];
const FORMATS: PromptResponseFormat[] = ['text', 'json', 'json_schema'];

const derive_provider = (model: string): 'OpenAI' | 'Anthropic' | 'Unknown' => {
  try {
    if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return 'OpenAI';
    if (model.startsWith('claude-')) return 'Anthropic';
    return 'Unknown';
  } catch {
    return 'Unknown';
  }
};

const TEMP_SEGMENTS = [
  { label: 'Precise',  hex: '#3b82f6', badge_class: 'bg-blue-50 text-blue-700 border-blue-200',  hint: 'Deterministic. Same prompt always gives the same output. Use for extraction, JSON parsing, and any structured task where reliability matters.' },
  { label: 'Focused',  hex: '#06b6d4', badge_class: 'bg-cyan-50 text-cyan-700 border-cyan-200',  hint: 'Mostly consistent with subtle variation. Good for document analysis, classification, and structured generation with a little flexibility.' },
  { label: 'Balanced', hex: '#10b981', badge_class: 'bg-green-50 text-green-700 border-green-200', hint: 'Natural mix of accuracy and variety. Suitable for general Q&A, summaries, and conversational tasks.' },
  { label: 'Creative', hex: '#f59e0b', badge_class: 'bg-amber-50 text-amber-700 border-amber-200', hint: 'Noticeably varied outputs. The AI explores less obvious choices. Good for brainstorming, drafting copy, and open-ended generation.' },
  { label: 'Wild',     hex: '#ef4444', badge_class: 'bg-red-50 text-red-700 border-red-200',   hint: 'Highly unpredictable. The AI frequently picks low-probability words. Use only for ideation or creative experiments.' },
] as const;

type TempSegment = typeof TEMP_SEGMENTS[number];

const active_segment = (t: number): TempSegment => {
  if (t <= 0.3) return TEMP_SEGMENTS[0];
  if (t <= 0.7) return TEMP_SEGMENTS[1];
  if (t <= 1.1) return TEMP_SEGMENTS[2];
  if (t <= 1.6) return TEMP_SEGMENTS[3];
  return TEMP_SEGMENTS[4];
};

@Component({
  selector:    'bs-admin-prompt-edit',
  imports:     [FormsModule, NgClass, RouterLink, Header, Button, Chip],
  templateUrl: './admin-prompt-edit.html',
})
export class AdminPromptEdit implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly admin  = inject(AdminService);

  readonly loading = signal(true);
  readonly saving  = signal(false);
  readonly error   = signal<string | null>(null);
  readonly prompt  = signal<AdminPromptFull | null>(null);
  readonly dirty   = signal(false);

  readonly models          = MODELS;
  readonly formats         = FORMATS;
  readonly derive_provider = derive_provider;
  readonly active_segment  = active_segment;

  form = {
    model:           '' as PromptModel,
    temperature:     0.7,
    max_tokens:      2000,
    response_format: 'json' as PromptResponseFormat,
    system_text:     '',
    user_template:   '',
    notes:           '',
  };

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    try {
      const res = await this.admin.get_prompt(id);
      if (res.code !== 200) { this.error.set(res.message); return; }
      this.prompt.set(res.data);
      this.fill_form(res.data);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load prompt');
    } finally {
      this.loading.set(false);
    }
  }

  private fill_form(p: AdminPromptFull): void {
    if (!p.version) return;
    this.form.model           = p.version.model;
    this.form.temperature     = p.version.temperature;
    this.form.max_tokens      = p.version.max_tokens;
    this.form.response_format = p.version.response_format;
    this.form.system_text     = p.version.system_text;
    this.form.user_template   = p.version.user_template;
    this.form.notes           = p.version.notes ?? '';
  }

  mark_dirty(): void { this.dirty.set(true); }

  async save(): Promise<void> {
    const p = this.prompt();
    if (!p) return;
    this.saving.set(true);
    try {
      const body: UpdatePromptBody = {
        model:           this.form.model,
        temperature:     this.form.temperature,
        max_tokens:      this.form.max_tokens,
        response_format: this.form.response_format,
        system_text:     this.form.system_text,
        user_template:   this.form.user_template,
        notes:           this.form.notes || undefined,
      };
      await this.admin.update_prompt(p.id, body);
      this.dirty.set(false);
      await this.router.navigate(['/admin/prompts']);
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void { this.router.navigate(['/admin/prompts']); }
}
