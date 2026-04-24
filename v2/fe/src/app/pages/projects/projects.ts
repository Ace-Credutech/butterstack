import { Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { GlobalService } from '../../services/global.service';
import { Header } from '../../components/organisms/header/header';
import { GravityDirective } from '../../directives/gravity.directive';

@Component({
  selector:    'bs-projects',
  imports:     [JsonPipe, Header, GravityDirective],
  templateUrl: './projects.html',
})
export class Projects {
  protected readonly global = inject(GlobalService);
}
