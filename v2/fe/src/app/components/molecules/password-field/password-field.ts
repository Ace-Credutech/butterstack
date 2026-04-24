import { Component, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Label } from '../../atoms/label/label';

@Component({
  selector:    'bs-password-field',
  imports:     [FormsModule, Label],
  templateUrl: './password-field.html',
})
export class PasswordField {
  readonly value        = model<string>('');
  readonly label        = input<string>('Password');
  readonly name         = input('password');
  readonly placeholder  = input('Enter password');
  readonly required     = input(false);
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly minlength    = input<number | null>(null);

  readonly visible = signal(false);

  toggle() { this.visible.update(v => !v); }
}
