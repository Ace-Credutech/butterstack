import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector:    'bs-step-modules',
  imports:     [FormsModule],
  templateUrl: './step-modules.html',
})
export class StepModules {
  @Output() regenerate = new EventEmitter<string>();

  has_data = false;
  page = 1;
  per_page = 8;

  selected: number[] = [];
  comment_modal = false;
  comment_text = '';

  rows = [
    { sr_no: 1, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 2, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 3, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 4, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 5, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 6, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 7, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 8, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 9, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 10, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 11, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 12, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 13, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 14, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 15, module: '', sub_module: '', feature: '', description: '' },
    { sr_no: 16, module: '', sub_module: '', feature: '', description: '' },
  ];

  get total_pages() {
    return Math.ceil(this.rows.length / this.per_page);
  }

  get paged_rows() {
    const start = (this.page - 1) * this.per_page;
    return this.rows.slice(start, start + this.per_page);
  }

  get all_page_selected() {
    return this.paged_rows.every(r => this.selected.includes(r.sr_no));
  }

  get_row_index(i: number) {
    return (this.page - 1) * this.per_page + i;
  }

  toggle_row(sr_no: number) {
    if (this.selected.includes(sr_no)) {
      this.selected = this.selected.filter(s => s !== sr_no);
    } else {
      this.selected.push(sr_no);
    }
  }

  toggle_all() {
    if (this.all_page_selected) {
      const page_ids = this.paged_rows.map(r => r.sr_no);
      this.selected = this.selected.filter(s => !page_ids.includes(s));
    } else {
      for (const r of this.paged_rows) {
        if (!this.selected.includes(r.sr_no)) {
          this.selected.push(r.sr_no);
        }
      }
    }
  }

  check_data() {
    this.has_data = this.rows.some(r => r.module || r.feature);
  }

  get_feature_label(sr_no: number): string {
    const row = this.rows.find(r => r.sr_no === sr_no);
    return row?.feature || 'Feature ' + sr_no;
  }

  open_comment() {
    this.comment_text = '';
    this.comment_modal = true;
  }

  submit_comment() {
    if (!this.comment_text) return;
    const row_labels = this.selected.map(s => this.get_feature_label(s)).join(', ');
    this.regenerate.emit(row_labels + ': ' + this.comment_text);
    this.comment_modal = false;
    this.comment_text = '';
    this.selected = [];
  }
}
