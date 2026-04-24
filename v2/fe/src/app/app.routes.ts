import { Routes } from '@angular/router';
import { auth_guard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivateChild: [auth_guard],
    children: [
      { path: '',             loadComponent: () => import('./pages/landing/landing').then(m => m.Landing)                                           },
      { path: 'login',        loadComponent: () => import('./pages/login/login').then(m => m.Login),         data: { authenticated: false }         },
      { path: 'register',     loadComponent: () => import('./pages/register/register').then(m => m.Register), data: { authenticated: false }        },
      { path: 'app/projects', loadComponent: () => import('./pages/projects/projects').then(m => m.Projects), data: { authenticated: true  }        },
    ],
  },
  { path: '**', redirectTo: '' },
];
