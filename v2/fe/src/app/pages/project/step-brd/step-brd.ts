import { Component } from '@angular/core';

@Component({
  selector:    'bs-step-brd',
  templateUrl: './step-brd.html',
})
export class StepBrd {
  status = 'idle';

  generate_brd() {
    this.status = 'generating';
    setTimeout(() => { this.status = 'done'; }, 2000);
  }
}
