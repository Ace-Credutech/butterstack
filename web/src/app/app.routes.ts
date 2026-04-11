import { Routes } from '@angular/router'

export const routes: Routes = [
  { path: '',         loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
  { path: 'projects', loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsComponent) },
  { path: 'projects/:id', loadComponent: () => import('./pages/workspace/workspace.component').then(m => m.WorkspaceComponent) },
  { path: '**', redirectTo: '' },
]
