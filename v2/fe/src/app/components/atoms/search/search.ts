import { Component, ElementRef, input, model, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector:    'bs-search',
  imports:     [FormsModule],
  templateUrl: './search.html',
})
export class Search {
  readonly value       = model<string>('');
  readonly placeholder = input<string>('Search...');
  readonly hint        = input<string>('');

  readonly input_ref = viewChild<ElementRef<HTMLInputElement>>('input_el');

  focus() { this.input_ref()?.nativeElement.focus(); }
  clear() { this.value.set(''); this.focus(); }
}
