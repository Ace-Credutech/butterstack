import { Component, input, model } from '@angular/core';

@Component({
  selector:    'bs-checkbox',
  templateUrl: './checkbox.html',
})
export class Checkbox {
  readonly checked       = model(false);
  readonly indeterminate = input(false);
  readonly disabled      = input(false);
  readonly label         = input<string>('');

  toggle() {
    if (this.disabled()) return;
    this.checked.set(!this.checked());
  }
}
