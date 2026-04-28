import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Header } from '../../components/organisms/header/header';
import { Chip }   from '../../components/atoms/chip/chip';
import { AdminService, AdminPrompt, PromptModel } from '../../services/admin.service';

const CATEGORIES  = ['project', 'intake', 'regenerate', 'admin', 'context', 'conversation', 'system'];
const PAGE_SIZES  = [5, 10, 25, 50, 100];

const model_tone = (model: PromptModel | undefined): 'violet' | 'green' | 'blue' | 'slate' => {
  if (!model) return 'slate';
  if (model.startsWith('claude-opus'))   return 'violet';
  if (model.startsWith('claude-sonnet')) return 'green';
  if (model.startsWith('claude-haiku'))  return 'blue';
  return 'slate';
};

const matches_query = (p: AdminPrompt, q: string): boolean => {
  const lower = q.toLowerCase();
  return p.name.toLowerCase().includes(lower)
    || p.slug.toLowerCase().includes(lower)
    || (p.description ?? '').toLowerCase().includes(lower);
};

@Component({
  selector:    'bs-admin-prompts',
  imports:     [Header, Chip],
  templateUrl: './admin-prompts.html',
})
export class AdminPrompts implements OnInit {
  private readonly admin  = inject(AdminService);
  private readonly router = inject(Router);

  readonly loading     = signal(false);
  readonly all_prompts = signal<AdminPrompt[]>([]);
  readonly search      = signal('');
  readonly category    = signal<string | null>(null);
  readonly page        = signal(1);
  readonly page_size   = signal(25);

  readonly categories = CATEGORIES;
  readonly page_sizes = PAGE_SIZES;
  protected model_tone = model_tone;

  readonly filtered = computed(() => {
    const q   = this.search().trim();
    const cat = this.category();
    return this.all_prompts().filter(p => {
      const cat_match   = !cat || p.category === cat;
      const query_match = !q   || matches_query(p, q);
      return cat_match && query_match;
    });
  });

  readonly total_pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.page_size())));

  readonly page_numbers = computed(() => {
    const total = this.total_pages();
    const cur   = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (cur > 3)         pages.push('…');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push('…');
    pages.push(total);
    return pages;
  });

  readonly visible = computed(() => {
    const start = (this.page() - 1) * this.page_size();
    return this.filtered().slice(start, start + this.page_size());
  });

  readonly range_label = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return '0 results';
    const start = (this.page() - 1) * this.page_size() + 1;
    const end   = Math.min(this.page() * this.page_size(), total);
    return `${start}–${end} of ${total}`;
  });

  constructor() {
    // reset to page 1 whenever filters or page size change
    effect(() => {
      this.search(); this.category(); this.page_size();
      this.page.set(1);
    });
  }

  async ngOnInit() {
    this.loading.set(true);
    try {
      const res = await this.admin.list_prompts();
      this.all_prompts.set(res.data.items);
    } finally {
      this.loading.set(false);
    }
  }

  set_search(e: Event)      { this.search.set((e.target as HTMLInputElement).value); }
  set_page_size(e: Event)   { this.page_size.set(Number((e.target as HTMLSelectElement).value)); }
  set_category(c: string)   { this.category.set(this.category() === c ? null : c); }
  go_page(p: number | '…') { if (typeof p === 'number') this.page.set(p); }
  prev_page()               { this.page.update(p => Math.max(1, p - 1)); }
  next_page()               { this.page.update(p => Math.min(this.total_pages(), p + 1)); }
  open(p: AdminPrompt)      { this.router.navigate(['/admin/prompts', p.id]); }
}
