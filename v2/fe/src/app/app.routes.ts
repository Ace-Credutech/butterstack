import { Routes } from '@angular/router';
import { auth_guard } from './auth.guard';

export const routes: Routes = [
  { path: '',             loadComponent: () => import('./landing').then(m => m.Landing) },
  { path: 'login',        loadComponent: () => import('./login').then(m => m.Login) },
  { path: 'register',     loadComponent: () => import('./register').then(m => m.Register) },
  { path: 'app/projects', loadComponent: () => import('./projects').then(m => m.Projects), canActivate: [auth_guard] },
  { path: '**', redirectTo: '' },
];
