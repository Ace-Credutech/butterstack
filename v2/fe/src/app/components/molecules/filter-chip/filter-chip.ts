import { Component, input, output, signal } from '@angular/core';
import { Checkbox } from '../../atoms/checkbox/checkbox';

export type FilterOption = { value: string; label: string; count?: number };

@Component({
  selector:    'bs-filter-chip',
  imports:     [Checkbox],
  templateUrl: './filter-chip.html',
})
export class FilterChip {
  readonly label    = input.required<string>();
  readonly options  = input.required<FilterOption[]>();
  readonly selected = input<string[]>([]);
  readonly changed  = output<string[]>();

  readonly open = signal(false);

  toggle()       { this.open.set(!this.open()); }
  close()        { this.open.set(false); }
  is_selected(v: string): boolean { return this.selected().includes(v); }

  toggle_value(v: string) {
    const current = new Set(this.selected());
    if (current.has(v)) current.delete(v); else current.add(v);
    this.changed.emit(Array.from(current));
  }

  clear_all() { this.changed.emit([]); }
}
