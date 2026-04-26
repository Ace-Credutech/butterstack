import { Component, input, computed } from '@angular/core';

const green_pairs = [
  ['from-green-500',   'to-emerald-600'],
  ['from-emerald-500', 'to-teal-600'],
  ['from-green-400',   'to-green-700'],
  ['from-teal-500',    'to-green-600'],
  ['from-emerald-400', 'to-green-600'],
  ['from-lime-500',    'to-green-600'],
];

const hash_string = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
};

@Component({
  selector:    'bs-avatar',
  templateUrl: './avatar.html',
})
export class Avatar {
  readonly name = input.required<string>();
  readonly id   = input<string>('');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg'>('sm');

  readonly initials = computed(() => initials(this.name()));
  readonly gradient = computed(() => {
    const seed = this.id() || this.name();
    const [from, to] = green_pairs[hash_string(seed) % green_pairs.length];
    return `bg-gradient-to-br ${from} ${to}`;
  });

  protected size_class(): string {
    return { xs: 'w-5 h-5 text-[9px]', sm: 'w-7 h-7 text-[11px]', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-sm' }[this.size()];
  }
}
