import { Component, Input } from '@angular/core';

@Component({
  selector:    'bs-tab-brd',
  templateUrl: './tab-brd.html',
})
export class TabBrd {
  @Input() project_name = 'Document Management System';

  control_sheet = [
    { label: 'Current Version', value: '1.0' },
    { label: 'Project Code',    value: 'DOCUMENT-MANAGEMENT-SYSTEM-2026' },
    { label: 'Project Name',    value: 'Document Management System' },
    { label: 'Document Type',   value: 'Business Requirements Document' },
    { label: 'Author',          value: 'Sameer Hapani' },
    { label: 'Reviewed By',     value: 'Sameer Hapani' },
    { label: 'Creation Date',   value: '22 April 2026' },
    { label: 'Last Updated',    value: '22 April 2026' },
  ];

  revisions = [
    { version: '1.0', date: '22 April 2026', author: 'Sameer Hapani', comments: 'Initial version — auto-generated' },
  ];
}
