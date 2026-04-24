import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Label } from '../../atoms/label/label';
import { Input as InputAtom } from '../../atoms/input/input';

@Component({
  selector:    'bs-form-field',
  imports:     [FormsModule, Label, InputAtom],
  templateUrl: './form-field.html',
})
export class FormField {
  readonly value        = model<string>('');
  readonly label        = input.required<string>();
  readonly type         = input<'text' | 'email' | 'password' | 'number'>('text');
  readonly name         = input('');
  readonly placeholder  = input('');
  readonly required     = input(false);
  readonly autocomplete = input('');
  readonly error        = input<string | null>(null);
}
