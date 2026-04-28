import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Header }        from '../../components/organisms/header/header';
import { SectionHeader } from '../../components/molecules/section-header/section-header';
import { Chip }          from '../../components/atoms/chip/chip';
import { AdminService, AdminPrompt, PromptModel } from '../../services/admin.service';

const category_order = ['project', 'intake', 'regenerate', 'admin', 'context', 'conversation', 'system'];

const model_tone = (model: PromptModel | undefined): 'violet' | 'green' | 'blue' | 'slate' => {
  if (!model) return 'slate';
  if (model.startsWith('claude-opus'))   return 'violet';
  if (model.startsWith('claude-sonnet')) return 'green';
  if (model.startsWith('claude-haiku'))  return 'blue';
  return 'slate';
};

const group_by_category = (items: AdminPrompt[]): { category: string; prompts: AdminPrompt[] }[] => {
  const map = new Map<string, AdminPrompt[]>();
  for (const p of items) {
    const list = map.get(p.category) ?? [];
    list.push(p);
    map.set(p.category, list);
  }
  return category_order
    .filter(c => map.has(c))
    .map(c => ({ category: c, prompts: map.get(c)! }));
};

@Component({
  selector:    'bs-admin-prompts',
  imports:     [Header, SectionHeader, Chip],
  templateUrl: './admin-prompts.html',
})
export class AdminPrompts implements OnInit {
  private readonly admin  = inject(AdminService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly groups  = signal<{ category: string; prompts: AdminPrompt[] }[]>([]);

  protected model_tone = model_tone;

  async ngOnInit() {
    this.loading.set(true);
    try {
      const res = await this.admin.list_prompts();
      this.groups.set(group_by_category(res.data.items));
    } finally {
      this.loading.set(false);
    }
  }

  open(p: AdminPrompt) {
    this.router.navigate(['/admin/prompts', p.id]);
  }
}
