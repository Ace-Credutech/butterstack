import { Component, input, output } from '@angular/core';

export type SavedView = { id: string; label: string; count?: number };

@Component({
  selector:    'bs-saved-view-tabs',
  templateUrl: './saved-view-tabs.html',
})
export class SavedViewTabs {
  readonly views          = input.required<SavedView[]>();
  readonly active_id      = input.required<string>();
  readonly view_selected  = output<string>();
}
