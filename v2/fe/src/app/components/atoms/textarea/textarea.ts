import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector:    'bs-textarea',
  imports:     [FormsModule],
  templateUrl: './textarea.html',
})
export class Textarea {
  readonly value       = model<string>('');
  readonly placeholder = input<string>('');
  readonly rows        = input<number>(4);
  readonly disabled    = input(false);
}
