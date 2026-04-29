import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { Router } from '@angular/router';
import { GlobalService } from '../../services/global.service';
import { ProjectsService, ProjectListItem } from '../../services/projects.service';
import { Header } from '../../components/organisms/header/header';
import { GravityDirective } from '../../directives/gravity.directive';
import { Button } from '../../components/atoms/button/button';

@Component({
  selector:    'bs-projects',
  imports:     [JsonPipe, DatePipe, Header, GravityDirective, Button],
  templateUrl: './projects.html',
})
export class Projects implements OnInit {
  protected readonly global   = inject(GlobalService);
  private   readonly router   = inject(Router);
  private   readonly projects = inject(ProjectsService);

  readonly items   = signal<ProjectListItem[]>([]);
  readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      const res = await this.projects.list();
      this.items.set(res.data?.items ?? []);
    } catch { /* ignore */ }
    finally { this.loading.set(false); }
  }

  go_to_new(): void { this.router.navigateByUrl('/app/projects/new'); }

  resume(p: ProjectListItem): void { this.router.navigate(['/app/projects', p.id, 'wizard']); }
}
