import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector:    'bs-brand-mark',
  imports:     [RouterLink],
  templateUrl: './brand-mark.html',
})
export class BrandMark {
  readonly theme = input<'light' | 'dark'>('dark');
  readonly size  = input<'sm' | 'md' | 'lg'>('sm');

  protected tile_class(): string {
    const base   = 'rounded-lg flex items-center justify-center';
    const themes = { light: 'bg-white/20 backdrop-blur', dark: 'bg-green-600' };
    const sizes  = { sm: 'w-7 h-7', md: 'w-8 h-8', lg: 'w-10 h-10' };
    return [base, themes[this.theme()], sizes[this.size()]].join(' ');
  }

  protected text_class(): string {
    const base   = 'font-bold tracking-tight';
    const themes = { light: 'text-white', dark: 'text-gray-900' };
    const sizes  = { sm: '', md: '', lg: 'text-lg' };
    return [base, themes[this.theme()], sizes[this.size()]].filter(Boolean).join(' ');
  }
}
