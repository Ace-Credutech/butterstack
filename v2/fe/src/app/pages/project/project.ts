import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Header } from '../../components/organisms/header/header';
import { GlobalService } from '../../services/global.service';
import { ProjectStepper } from './project-stepper/project-stepper';
import { StepMaterials } from './step-materials/step-materials';
import { StepConversation } from './step-conversation/step-conversation';
import { StepModules } from './step-modules/step-modules';
import { StepBrd } from './step-brd/step-brd';

@Component({
  selector:    'bs-project',
  imports:     [FormsModule, Header, ProjectStepper, StepMaterials, StepConversation, StepModules, StepBrd],
  templateUrl: './project.html',
})
export class Project {
  global = inject(GlobalService);

  view = 'list';

  projects = [
    { id: '1', name: 'Quality Management',         description: '', status: 'active', ago: '26m ago' },
    { id: '2', name: 'Document Management System', description: '', status: 'active', ago: '21d ago' },
    { id: '3', name: 'Gov OS',                     description: '', status: 'active', ago: '22d ago' },
  ];

  card_colors = ['bg-green-500', 'bg-emerald-500', 'bg-teal-500'];

  modal_open = false;
  new_name   = '';
  new_desc   = '';

  active_step = 1;
  completed_steps: number[] = [];

  open_project() {
    this.active_step = 1;
    this.completed_steps = [];
    this.view = 'init';
  }

  back_to_list() {
    this.view = 'list';
  }

  open_modal() {
    this.new_name = '';
    this.new_desc = '';
    this.modal_open = true;
  }

  create_project() {
    if (!this.new_name) return;
    this.projects.unshift({
      id:          String(Date.now()),
      name:        this.new_name,
      description: this.new_desc,
      status:      'active',
      ago:         'just now',
    });
    this.modal_open = false;
    this.open_project();
  }

  go_to_step(step: number) {
    this.active_step = step;
  }

  complete_and_go(current: number, next: number) {
    if (!this.completed_steps.includes(current)) {
      this.completed_steps.push(current);
    }
    this.active_step = next;
  }

  on_finish() {
    if (!this.completed_steps.includes(4)) {
      this.completed_steps.push(4);
    }
    this.view = 'list';
  }
}
