import { Component, computed, input, model, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ColumnHeader } from '../../molecules/column-header/column-header';
import { Checkbox } from '../../atoms/checkbox/checkbox';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { EmptyState } from '../../atoms/empty-state/empty-state';
import { TableColumn, TableSort } from './table.types';

const skeleton_widths = ['60%', '80%', '40%', '70%', '50%', '90%'];
const skeleton_for_index = (i: number): string => skeleton_widths[i % skeleton_widths.length];

@Component({
  selector:    'bs-table',
  imports:     [NgTemplateOutlet, ScrollingModule, ColumnHeader, Checkbox, Skeleton, EmptyState],
  templateUrl: './table.html',
})
export class Table<T extends { id: string }> {
  readonly columns        = input.required<TableColumn<T>[]>();
  readonly rows           = input.required<T[]>();
  readonly loading        = input(false);
  readonly density        = input<'compact' | 'comfortable'>('comfortable');
  readonly selectable     = input(false);
  readonly selection      = model<Set<string>>(new Set());
  readonly sort           = model<TableSort | null>(null);
  readonly sticky_header  = input(true);
  readonly empty_title    = input('No results');
  readonly empty_subtitle = input('Try adjusting your filters or search.');
  readonly empty_cta      = input('');
  readonly viewport_height = input<string>('560px');
  readonly virtualize      = input<boolean>(true);

  readonly row_clicked    = output<T>();
  readonly empty_action   = output<void>();

  readonly skeleton_rows  = Array.from({ length: 6 }, (_, i) => i);
  readonly skeleton_for_index = skeleton_for_index;

  readonly all_selected = computed(() => this.rows().length > 0 && this.rows().every(r => this.selection().has(r.id)));
  readonly some_selected = computed(() => {
    const sel = this.selection();
    const rows = this.rows();
    return rows.some(r => sel.has(r.id)) && !rows.every(r => sel.has(r.id));
  });

  readonly row_height = computed(() => this.density() === 'compact' ? 36 : 52);
  readonly should_virtualize = computed(() => this.virtualize() && !this.loading() && this.rows().length > 30);

  protected align_class(col: TableColumn<T>): string {
    return col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
  }

  protected on_sort(col: TableColumn<T>) {
    if (!col.sortable) return;
    const current = this.sort();
    if (!current || current.col !== col.id) { this.sort.set({ col: col.id, dir: 'asc' }); return; }
    if (current.dir === 'asc') { this.sort.set({ col: col.id, dir: 'desc' }); return; }
    this.sort.set(null);
  }

  protected sort_active(col: TableColumn<T>): boolean { return this.sort()?.col === col.id; }
  protected sort_dir(): 'asc' | 'desc' { return this.sort()?.dir ?? 'asc'; }

  protected toggle_all() {
    const rows = this.rows();
    if (this.all_selected()) { this.selection.set(new Set()); return; }
    this.selection.set(new Set(rows.map(r => r.id)));
  }

  protected toggle_row(row: T, event: Event) {
    event.stopPropagation();
    const sel = new Set(this.selection());
    if (sel.has(row.id)) sel.delete(row.id); else sel.add(row.id);
    this.selection.set(sel);
  }

  protected on_row_click(row: T) { this.row_clicked.emit(row); }
  protected track_by_id        = (_: number, row: T) => row.id;
}
