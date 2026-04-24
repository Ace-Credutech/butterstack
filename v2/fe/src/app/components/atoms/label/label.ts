import { Component, input } from '@angular/core';

@Component({
  selector:    'bs-label',
  templateUrl: './label.html',
})
export class Label {
  readonly for_id = input<string>('');
}
