import { Component, input, output } from '@angular/core';

export type BulkAction = { id: string; label: string; danger?: boolean };

@Component({
  selector:    'bs-bulk-action-bar',
  templateUrl: './bulk-action-bar.html',
})
export class BulkActionBar {
  readonly count            = input.required<number>();
  readonly actions          = input.required<BulkAction[]>();
  readonly action_selected  = output<string>();
  readonly cancel_clicked   = output<void>();
}
