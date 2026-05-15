import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector:    'bs-project-stepper',
  templateUrl: './project-stepper.html',
})
export class ProjectStepper {
  @Input() active = 1;
  @Input() completed: number[] = [];
  @Output() step_click = new EventEmitter<number>();

  steps = [
    { id: 1, label: 'Step 1', sub: 'Materials and Brief' },
    { id: 2, label: 'Step 2', sub: 'Conversation' },
    { id: 3, label: 'Step 3', sub: 'Module and Feature Finalization' },
    { id: 4, label: 'Step 4', sub: 'BRD' },
  ];
}
