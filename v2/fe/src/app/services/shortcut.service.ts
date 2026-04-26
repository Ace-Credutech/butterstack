import { DestroyRef, inject, Injectable, signal } from '@angular/core';

export type Shortcut = {
  keys:        string;
  description: string;
  group?:      string;
  match:       (e: KeyboardEvent) => boolean;
  handler:     (e: KeyboardEvent) => void;
};

const is_typing_target = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
};

@Injectable({ providedIn: 'root' })
export class ShortcutService {
  private readonly destroy = inject(DestroyRef);

  private shortcuts: Set<Shortcut> = new Set();
  readonly cheatsheet_open = signal(false);
  readonly registered      = signal<Shortcut[]>([]);

  constructor() {
    const handler = (e: KeyboardEvent) => this.dispatch(e);
    window.addEventListener('keydown', handler);
    this.destroy.onDestroy(() => window.removeEventListener('keydown', handler));

    this.register({
      keys:        '?',
      description: 'Show keyboard shortcuts',
      group:       'Global',
      match:       (e) => e.key === '?' && !is_typing_target(e.target),
      handler:     (e) => { e.preventDefault(); this.cheatsheet_open.update(v => !v); },
    });
    this.register({
      keys:        'Esc',
      description: 'Close dialog / drawer',
      group:       'Global',
      match:       (e) => e.key === 'Escape' && this.cheatsheet_open(),
      handler:     (e) => { e.preventDefault(); this.cheatsheet_open.set(false); },
    });
  }

  register(s: Shortcut): () => void {
    this.shortcuts.add(s);
    this.registered.set(Array.from(this.shortcuts));
    return () => { this.shortcuts.delete(s); this.registered.set(Array.from(this.shortcuts)); };
  }

  private dispatch(e: KeyboardEvent) {
    for (const s of this.shortcuts) {
      if (s.match(e)) { s.handler(e); break; }
    }
  }
}
