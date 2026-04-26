import { Component, input, output, signal } from '@angular/core';
import { IconButton } from '../../atoms/icon-button/icon-button';

export type RowAction = { id: string; label: string; danger?: boolean; disabled?: boolean };

@Component({
  selector:    'bs-row-actions-menu',
  imports:     [IconButton],
  templateUrl: './row-actions-menu.html',
})
export class RowActionsMenu {
  readonly actions  = input.required<RowAction[]>();
  readonly selected = output<string>();

  readonly open = signal(false);

  toggle() { this.open.set(!this.open()); }
  close()  { this.open.set(false); }

  pick(action: RowAction) {
    if (action.disabled) return;
    this.selected.emit(action.id);
    this.close();
  }
}
