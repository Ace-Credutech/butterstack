import { Component, input } from '@angular/core';

@Component({
  selector:    'bs-icon',
  templateUrl: './icon.html',
})
export class Icon {
  readonly path  = input.required<string>();
  readonly size  = input<'sm' | 'md' | 'lg'>('md');
  readonly color = input<string>('currentColor');

  protected size_class(): string {
    return { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-6 h-6' }[this.size()];
  }
}
