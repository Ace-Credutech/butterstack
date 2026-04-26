import { Component, computed, inject } from '@angular/core';
import { ShortcutService } from '../../../services/shortcut.service';
import { Kbd } from '../../atoms/kbd/kbd';
import { IconButton } from '../../atoms/icon-button/icon-button';

@Component({
  selector:    'bs-shortcut-cheatsheet',
  imports:     [Kbd, IconButton],
  templateUrl: './shortcut-cheatsheet.html',
})
export class ShortcutCheatsheet {
  protected readonly shortcuts = inject(ShortcutService);

  readonly groups = computed(() => {
    const grouped: Record<string, { keys: string; description: string }[]> = {};
    for (const s of this.shortcuts.registered()) {
      const g = s.group ?? 'General';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push({ keys: s.keys, description: s.description });
    }
    return Object.entries(grouped).map(([name, items]) => ({ name, items }));
  });

  protected close() { this.shortcuts.cheatsheet_open.set(false); }

  protected key_parts(combo: string): string[] {
    return combo.split('+').map(p => p.trim());
  }
}
