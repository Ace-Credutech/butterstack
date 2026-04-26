import { TemplateRef } from '@angular/core';

export type SortDir = 'asc' | 'desc';

export type TableColumn<T> = {
  id:        string;
  header:    string;
  width?:    string;
  align?:    'left' | 'right' | 'center';
  sortable?: boolean;
  sticky?:   'left' | 'right';
  cell?:     TemplateRef<{ $implicit: T; row: T; index: number }>;
  text?:     (row: T) => string;
};

export type TableSort = { col: string; dir: SortDir };
