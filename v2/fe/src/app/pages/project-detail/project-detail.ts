import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Header } from '../../components/organisms/header/header';
import { DetailTabs } from './detail-tabs/detail-tabs';
import { DetailSidebar } from './detail-sidebar/detail-sidebar';
import { DetailPrototype } from './detail-prototype/detail-prototype';
import { DetailConversations } from './detail-conversations/detail-conversations';
import { TabDetails } from './tab-details/tab-details';
import { TabBrd } from './tab-brd/tab-brd';
import { TabExcel } from './tab-excel/tab-excel';
import { TabMindmap } from './tab-mindmap/tab-mindmap';

@Component({
  selector:    'bs-project-detail',
  imports:     [Header, DetailTabs, DetailSidebar, DetailPrototype, DetailConversations, TabDetails, TabBrd, TabExcel, TabMindmap],
  templateUrl: './project-detail.html',
})
export class ProjectDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  project_name = 'Document Management System';
  active_tab = 'prototype';
  active_device = 'desktop';
  selected_feature_id = '';
  selected_module_name = 'Access Control';

  module_tree = [
    {
      id: 'm1', name: 'Document Management', type: 'folder' as const, depth: 0, badge: 1, children: [
        { id: 'f1', name: 'Access Control', type: 'folder' as const, depth: 1, dot_color: 'green', children: [
          { id: 'f1a', name: 'Audit Logs',               type: 'leaf' as const, depth: 2, score: 54 },
          { id: 'f1b', name: 'RBAC',                     type: 'leaf' as const, depth: 2, score: 55 },
          { id: 'f1c', name: 'Document Level Permission', type: 'leaf' as const, depth: 2, score: 64 },
        ]},
        { id: 'f2', name: 'Admin Portal', type: 'folder' as const, depth: 1, dot_color: 'green', children: [
          { id: 'f2a', name: 'Manage Roles',       type: 'leaf' as const, depth: 2, score: 56 },
          { id: 'f2b', name: 'Document Actions',   type: 'leaf' as const, depth: 2, score: 53 },
          { id: 'f2c', name: 'Send for Approval',  type: 'leaf' as const, depth: 2, score: 55 },
          { id: 'f2d', name: 'Set Permissions',    type: 'leaf' as const, depth: 2, score: 51 },
          { id: 'f2e', name: 'Assign Roles',       type: 'leaf' as const, depth: 2, score: 54 },
        ]},
        { id: 'f3', name: 'Audit Trail', type: 'folder' as const, depth: 1, dot_color: 'green', children: [
          { id: 'f3a', name: 'Activity Logs',     type: 'leaf' as const, depth: 2, score: 54 },
          { id: 'f3b', name: 'Version Restore',   type: 'leaf' as const, depth: 2, score: 57 },
          { id: 'f3c', name: 'Compare Versions',  type: 'leaf' as const, depth: 2, score: 57 },
        ]},
        { id: 'f4', name: 'Backup & Disaster Recovery', type: 'folder' as const, depth: 1, badge: 1, children: [
          { id: 'f4a', name: 'Automated Backup',   type: 'leaf' as const, depth: 2, score: 50 },
          { id: 'f4b', name: 'Automated Sync',     type: 'leaf' as const, depth: 2, score: 54 },
          { id: 'f4c', name: 'Disaster Recovery',  type: 'leaf' as const, depth: 2, score: 49 },
        ]},
      ],
    },
  ];

  conversations = [
    { id: 'c1', title: 'go through the entire BRD and tell me ...', status: 'Done', messages: 6, ago: '22d ago', avatar: 'SH' },
    { id: 'c2', title: '"A Document Management System (D...',         status: 'Done', messages: 2, ago: '23d ago', avatar: 'SH' },
  ];

  selected_feature: any = null;

  private feature_data: Record<string, any> = {
    'f1a': {
      name: 'User', author: 'Akash Sadavarte',
      module_path: 'Manage access control settings for document management',
      page_title: 'Manage access control settings for document management',
      actions: [{ label: 'Assign Role', primary: true }, { label: 'View Audit Logs' }],
      stats: [
        { label: 'Total Users',         value: 150 },
        { label: 'Active Users',        value: 120 },
        { label: 'Roles Assigned',      value: 75 },
        { label: 'Audit Logs Accessed', value: 30 },
      ],
    },
  };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.project_name = 'Document Management System';
    this.on_feature_select('f1a');
  }

  on_feature_select(id: string) {
    this.selected_feature_id = id;
    this.selected_feature = this.feature_data[id] || {
      name: id, author: '', module_path: '', page_title: 'Feature Preview',
      actions: [], stats: [],
    };
  }

  on_conversation_select(id: string) {
    // TODO: open conversation detail
  }

  on_new_conversation() {
    // TODO: create new conversation
  }

  go_back() {
    this.router.navigate(['/app/projects']);
  }
}
