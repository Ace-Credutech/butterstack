import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type SelectOption = { value: string; label: string };

@Component({
  selector:    'bs-select',
  imports:     [FormsModule],
  templateUrl: './select.html',
})
export class Select {
  readonly value       = model<string>('');
  readonly options     = input.required<SelectOption[]>();
  readonly placeholder = input<string>('Select…');
  readonly disabled    = input(false);
}
