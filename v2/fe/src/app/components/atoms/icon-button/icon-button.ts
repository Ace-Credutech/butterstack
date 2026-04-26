import { Component, input, output } from '@angular/core';

@Component({
  selector:    'bs-icon-button',
  templateUrl: './icon-button.html',
})
export class IconButton {
  readonly path     = input.required<string>();
  readonly label    = input.required<string>();
  readonly size     = input<'sm' | 'md'>('md');
  readonly variant  = input<'ghost' | 'soft'>('ghost');
  readonly disabled = input(false);
  readonly clicked  = output<void>();

  protected classes(): string {
    const sizes    = { sm: 'w-7 h-7', md: 'w-8 h-8' };
    const variants = { ghost: 'hover:bg-gray-100 text-gray-500 hover:text-gray-700', soft: 'bg-gray-50 hover:bg-gray-100 text-gray-700' };
    return ['inline-flex items-center justify-center rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed', sizes[this.size()], variants[this.variant()]].join(' ');
  }

  protected svg_size(): string {
    return this.size() === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  }
}
