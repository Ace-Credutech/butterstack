import { Component, Input } from '@angular/core';

interface Action {
  label:    string;
  primary?: boolean;
}

interface Stat {
  label: string;
  value: string | number;
}

@Component({
  selector:    'bs-detail-prototype',
  templateUrl: './detail-prototype.html',
})
export class DetailPrototype {
  @Input() feature_name = '';
  @Input() author = '';
  @Input() module_path = '';
  @Input() page_title = '';
  @Input() actions: Action[] = [];
  @Input() stats: Stat[] = [];
}
