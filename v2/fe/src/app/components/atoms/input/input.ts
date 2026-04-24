import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector:    'bs-input',
  imports:     [FormsModule],
  templateUrl: './input.html',
})
export class Input {
  readonly value       = model<string>('');
  readonly type        = input<'text' | 'email' | 'password' | 'number'>('text');
  readonly placeholder = input('');
  readonly name        = input('');
  readonly required    = input(false);
  readonly autocomplete = input('');
}
