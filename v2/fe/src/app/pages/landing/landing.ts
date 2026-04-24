import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Header } from '../../components/organisms/header/header';

@Component({
  selector:    'bs-landing',
  imports:     [Header],
  templateUrl: './landing.html',
})
export class Landing {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly features = ['Multilingual input', 'Live prototypes', 'Full versioning', 'Event-sourced', 'Role-aware', 'Export BRD/Excel/Mindmap'];

  open_projects() { this.router.navigate([this.auth.authenticated() ? '/app/projects' : '/login']); }
}
