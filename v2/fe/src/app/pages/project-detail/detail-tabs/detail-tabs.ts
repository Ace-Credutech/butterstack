import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector:    'bs-detail-tabs',
  templateUrl: './detail-tabs.html',
})
export class DetailTabs {
  @Input() project_name = '';
  @Input() active_tab = 'prototype';
  @Input() active_device = 'desktop';
  @Input() selected_module = 'Access Control';
  @Output() tab_click = new EventEmitter<string>();
  @Output() device_click = new EventEmitter<string>();

  tabs = [
    { id: 'details',   label: 'Details' },
    { id: 'prototype', label: 'Prototype' },
    { id: 'brd',       label: 'BRD' },
    { id: 'excel',     label: 'Excel' },
    { id: 'mindmap',   label: 'Mindmap' },
  ];

  devices = [
    { id: 'desktop', label: 'Desktop' },
    { id: 'tablet',  label: 'Tablet' },
    { id: 'mobile',  label: 'Mobile' },
  ];
}
