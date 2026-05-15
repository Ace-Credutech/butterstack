import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector:    'bs-step-materials',
  imports:     [FormsModule],
  templateUrl: './step-materials.html',
})
export class StepMaterials {
  brief = '';
  files: File[] = [];

  on_file_select(event: Event) {
    const el = event.target as HTMLInputElement;
    if (!el.files) return;
    for (let i = 0; i < el.files.length; i++) {
      this.files.push(el.files[i]);
    }
    el.value = '';
  }

  remove_file(i: number) {
    this.files.splice(i, 1);
  }
}
