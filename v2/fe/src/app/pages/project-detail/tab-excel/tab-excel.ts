import { Component } from '@angular/core';

@Component({
  selector:    'bs-tab-excel',
  templateUrl: './tab-excel.html',
})
export class TabExcel {
  modules = [
    { id: 378, name: 'Document Management',       path: 'document-management',                     depth: 0 },
    { id: 382, name: 'Access Control',             path: 'document-management/access-control',      depth: 1 },
    { id: 380, name: 'Admin Portal',               path: 'document-management/admin-portal',        depth: 1 },
    { id: 383, name: 'Audit Trail',                path: 'document-management/audit-trail',         depth: 1 },
    { id: 386, name: 'Backup & Disaster Recovery', path: 'document-management/backup--disaster-recovery', depth: 1 },
    { id: 379, name: 'Document Upload',            path: 'document-management/document-upload',     depth: 1 },
    { id: 385, name: 'Notifications',              path: 'document-management/notifications',       depth: 1 },
    { id: 381, name: 'Search',                     path: 'document-management/search',              depth: 1 },
    { id: 384, name: 'Workflow',                    path: 'document-management/workflow',            depth: 1 },
    { id: 425, name: 'Search',                     path: 'search',                                  depth: 0 },
    { id: 426, name: 'Document Search',            path: 'search/document-search',                  depth: 1 },
    { id: 427, name: 'Workflow',                    path: 'workflow',                                depth: 0 },
    { id: 428, name: 'Approval Workflow',          path: 'workflow/approval-workflow',               depth: 1 },
  ];

  features = [
    { id: 231, feature: 'RBAC',                      module: 'Access Control', module_path: 'document-management/access-control', status: 'draft', pm_status: 'not_started', summary: 'The Role-Based Access Cont' },
    { id: 232, feature: 'Document Level Permission',  module: 'Access Control', module_path: 'document-management/access-control', status: 'draft', pm_status: 'not_started', summary: 'The "Document Level Permis' },
    { id: 233, feature: 'Audit Logs',                module: 'Access Control', module_path: 'document-management/access-control', status: 'draft', pm_status: 'not_started', summary: 'The Audit Logs feature in the' },
    { id: 223, feature: 'Manage Roles',              module: 'Admin Portal',   module_path: 'document-management/admin-portal',   status: 'draft', pm_status: 'not_started', summary: 'The "Manage Roles" feature' },
    { id: 224, feature: 'Set Permissions',            module: 'Admin Portal',   module_path: 'document-management/admin-portal',   status: 'draft', pm_status: 'not_started', summary: 'The "Set Permissions" featur' },
  ];
}
