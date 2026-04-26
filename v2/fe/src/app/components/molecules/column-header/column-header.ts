import { Component, input, output } from '@angular/core';

@Component({
  selector:    'bs-column-header',
  templateUrl: './column-header.html',
})
export class ColumnHeader {
  readonly label     = input.required<string>();
  readonly sortable  = input(false);
  readonly active    = input(false);
  readonly direction = input<'asc' | 'desc'>('asc');
  readonly align     = input<'left' | 'right' | 'center'>('left');
  readonly clicked   = output<void>();
}
