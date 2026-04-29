import { Routes } from '@angular/router';
import { auth_guard } from './guards/auth.guard';
import { permission_guard } from './guards/permission.guard';

export const routes: Routes = [
  {
    path: '',
    canActivateChild: [auth_guard],
    children: [
      { path: '',             loadComponent: () => import('./pages/landing/landing').then(m => m.Landing)                                           },
      { path: 'login',        loadComponent: () => import('./pages/login/login').then(m => m.Login),           data: { authenticated: false }       },
      { path: 'register',     loadComponent: () => import('./pages/register/register').then(m => m.Register),  data: { authenticated: false }       },
      { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword) },
      { path: 'reset-password',  loadComponent: () => import('./pages/reset-password/reset-password').then(m => m.ResetPassword) },
      { path: 'app/projects',  loadComponent: () => import('./pages/projects/projects').then(m => m.Projects),   data: { authenticated: true } },
      { path: 'app/projects/new',
        loadComponent: () => import('./pages/project-create-wizard/project-create-wizard').then(m => m.ProjectCreateWizard),
        data: { authenticated: true } },
      { path: 'app/projects/:id/wizard',
        loadComponent: () => import('./pages/project-create-wizard/project-create-wizard').then(m => m.ProjectCreateWizard),
        data: { authenticated: true } },
      { path: 'app/documents', loadComponent: () => import('./pages/documents/documents').then(m => m.Documents), data: { authenticated: true } },
      {
        path: 'admin/users',
        loadComponent: () => import('./pages/admin-users/admin-users').then(m => m.AdminUsers),
        canActivate: [permission_guard('admin.users.read')],
        data: { authenticated: true },
      },
      {
        path: 'admin/roles',
        loadComponent: () => import('./pages/admin-roles/admin-roles').then(m => m.AdminRoles),
        canActivate: [permission_guard('admin.roles.read')],
        data: { authenticated: true },
      },
      {
        path: 'admin/roles/:id',
        loadComponent: () => import('./pages/admin-role-edit/admin-role-edit').then(m => m.AdminRoleEdit),
        canActivate: [permission_guard('admin.roles.read')],
        data: { authenticated: true },
      },
      {
        path: 'admin/prompts',
        loadComponent: () => import('./pages/admin-prompts/admin-prompts').then(m => m.AdminPrompts),
        canActivate: [permission_guard('admin.users.read')],
        data: { authenticated: true },
      },
      {
        path: 'admin/prompts/:id',
        loadComponent: () => import('./pages/admin-prompt-edit/admin-prompt-edit').then(m => m.AdminPromptEdit),
        canActivate: [permission_guard('admin.users.read')],
        data: { authenticated: true },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
