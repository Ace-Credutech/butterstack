import { Component, input, output } from '@angular/core';

type Tone    = 'neutral' | 'green' | 'amber' | 'red' | 'violet' | 'blue' | 'slate';
type Variant = 'solid' | 'soft' | 'outline';
type Size    = 'sm' | 'md';

const tone_map: Record<Variant, Record<Tone, string>> = {
  soft: {
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    green:   'bg-green-50 text-green-700 border-green-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    red:     'bg-red-50 text-red-700 border-red-200',
    violet:  'bg-violet-50 text-violet-700 border-violet-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    slate:   'bg-slate-50 text-slate-700 border-slate-200',
  },
  solid: {
    neutral: 'bg-gray-700 text-white border-gray-700',
    green:   'bg-green-600 text-white border-green-600',
    amber:   'bg-amber-500 text-white border-amber-500',
    red:     'bg-red-600 text-white border-red-600',
    violet:  'bg-violet-600 text-white border-violet-600',
    blue:    'bg-blue-600 text-white border-blue-600',
    slate:   'bg-slate-600 text-white border-slate-600',
  },
  outline: {
    neutral: 'bg-transparent text-gray-700 border-gray-300',
    green:   'bg-transparent text-green-700 border-green-300',
    amber:   'bg-transparent text-amber-700 border-amber-300',
    red:     'bg-transparent text-red-700 border-red-300',
    violet:  'bg-transparent text-violet-700 border-violet-300',
    blue:    'bg-transparent text-blue-700 border-blue-300',
    slate:   'bg-transparent text-slate-700 border-slate-300',
  },
};

@Component({
  selector:    'bs-chip',
  templateUrl: './chip.html',
})
export class Chip {
  readonly tone      = input<Tone>('neutral');
  readonly variant   = input<Variant>('soft');
  readonly size      = input<Size>('md');
  readonly removable = input(false);
  readonly removed   = output<void>();

  protected classes(): string {
    const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-xs px-2.5 py-1' };
    return ['inline-flex items-center gap-1.5 rounded-full border font-medium', tone_map[this.variant()][this.tone()], sizes[this.size()]].join(' ');
  }
}
