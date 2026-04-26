import { Component, input, output } from '@angular/core';

@Component({
  selector:    'bs-empty-state',
  templateUrl: './empty-state.html',
})
export class EmptyState {
  readonly title       = input.required<string>();
  readonly subtitle    = input<string>('');
  readonly cta_label   = input<string>('');
  readonly icon_path   = input<string>('M19 11H5m14-4l-4-4M5 19l4 4');
  readonly cta_clicked = output<void>();
}
