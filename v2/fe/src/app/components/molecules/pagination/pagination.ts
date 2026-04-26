import { Component, computed, input, output } from '@angular/core';
import { Select, SelectOption } from '../../atoms/select/select';
import { IconButton } from '../../atoms/icon-button/icon-button';

const compute_visible_pages = (page: number, total_pages: number): (number | 'gap')[] => {
  if (total_pages <= 7) return Array.from({ length: total_pages }, (_, i) => i + 1);
  const set: (number | 'gap')[] = [1];
  if (page > 4) set.push('gap');
  for (let p = Math.max(2, page - 1); p <= Math.min(total_pages - 1, page + 1); p++) set.push(p);
  if (page < total_pages - 3) set.push('gap');
  set.push(total_pages);
  return set;
};

@Component({
  selector:    'bs-pagination',
  imports:     [Select, IconButton],
  templateUrl: './pagination.html',
})
export class Pagination {
  readonly page         = input.required<number>();
  readonly size         = input.required<number>();
  readonly total        = input.required<number>();
  readonly size_options = input<number[]>([10, 25, 50, 100]);
  readonly page_changed = output<number>();
  readonly size_changed = output<number>();

  readonly total_pages   = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  readonly visible_pages = computed(() => compute_visible_pages(this.page(), this.total_pages()));
  readonly range_start   = computed(() => this.total() === 0 ? 0 : (this.page() - 1) * this.size() + 1);
  readonly range_end     = computed(() => Math.min(this.page() * this.size(), this.total()));
  readonly size_select   = computed<SelectOption[]>(() => this.size_options().map(n => ({ value: String(n), label: `${n} / page` })));
  readonly size_value    = computed(() => String(this.size()));

  go_prev() { if (this.page() > 1) this.page_changed.emit(this.page() - 1); }
  go_next() { if (this.page() < this.total_pages()) this.page_changed.emit(this.page() + 1); }
  go_to(n: number | 'gap') { if (typeof n === 'number') this.page_changed.emit(n); }
  on_size(value: string) { this.size_changed.emit(parseInt(value, 10)); }
}
