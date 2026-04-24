import { Component, input } from '@angular/core';

@Component({
  selector:    'bs-spinner',
  templateUrl: './spinner.html',
})
export class Spinner {
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected size_class(): string {
    return { sm: 'w-3 h-3 border-2', md: 'w-5 h-5 border-2', lg: 'w-8 h-8 border-[3px]' }[this.size()];
  }
}
