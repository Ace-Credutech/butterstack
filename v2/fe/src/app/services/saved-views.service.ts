import { Injectable } from '@angular/core';

export type SavedViewRecord<S> = { id: string; label: string; state: S };

const storage_key = (page_id: string) => `bs.views.${page_id}`;

@Injectable({ providedIn: 'root' })
export class SavedViewsService {
  list<S>(page_id: string): SavedViewRecord<S>[] {
    try {
      const raw = localStorage.getItem(storage_key(page_id));
      if (!raw) return [];
      return JSON.parse(raw) as SavedViewRecord<S>[];
    } catch { return []; }
  }

  save<S>(page_id: string, label: string, state: S): SavedViewRecord<S> {
    const list = this.list<S>(page_id);
    const id   = `view_${Date.now().toString(36)}`;
    const rec: SavedViewRecord<S> = { id, label, state };
    list.push(rec);
    localStorage.setItem(storage_key(page_id), JSON.stringify(list));
    return rec;
  }

  remove(page_id: string, view_id: string): void {
    const list = this.list(page_id).filter(v => v.id !== view_id);
    localStorage.setItem(storage_key(page_id), JSON.stringify(list));
  }
}
