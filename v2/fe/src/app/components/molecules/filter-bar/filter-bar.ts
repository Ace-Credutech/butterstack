import { Component, input, output } from '@angular/core';
import { Search } from '../../atoms/search/search';

@Component({
  selector:    'bs-filter-bar',
  imports:     [Search],
  templateUrl: './filter-bar.html',
})
export class FilterBar {
  readonly query           = input<string>('');
  readonly query_changed   = output<string>();
  readonly search_hint     = input<string>('');
  readonly active_filters  = input<number>(0);
  readonly clear_clicked   = output<void>();
}
