import { Routes } from '@angular/router'
import { authGuard } from './guards/auth.guard'

export const routes: Routes = [
  { path: '',          loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
  { path: 'login',    loadComponent: () => import('./pages/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/auth/register.component').then(m => m.RegisterComponent) },
  { path: 'projects', loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsComponent), canActivate: [authGuard] },
  { path: 'projects/:id', loadComponent: () => import('./pages/workspace/workspace.component').then(m => m.WorkspaceComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
]
