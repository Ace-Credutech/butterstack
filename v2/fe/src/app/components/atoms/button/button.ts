import { Component, input, output } from '@angular/core';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

@Component({
  selector:    'bs-button',
  templateUrl: './button.html',
})
export class Button {
  readonly variant  = input<Variant>('primary');
  readonly size     = input<Size>('md');
  readonly type     = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly loading  = input(false);
  readonly full     = input(false);

  readonly clicked = output<void>();

  protected classes(): string {
    const base      = 'inline-flex items-center justify-center font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';
    const variants  = { primary: 'bg-green-600 hover:bg-green-700 text-white', secondary: 'bg-white border border-gray-200 hover:border-gray-300 text-gray-700', ghost: 'text-gray-500 hover:text-gray-900' };
    const sizes     = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2.5', lg: 'text-base px-6 py-3' };
    const width     = this.full() ? 'w-full' : '';
    return [base, variants[this.variant()], sizes[this.size()], width].filter(Boolean).join(' ');
  }
}
