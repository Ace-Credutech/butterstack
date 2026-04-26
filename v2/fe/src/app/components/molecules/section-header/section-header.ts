import { Component, input } from '@angular/core';

@Component({
  selector:    'bs-section-header',
  templateUrl: './section-header.html',
})
export class SectionHeader {
  readonly title    = input.required<string>();
  readonly subtitle = input<string>('');
}
