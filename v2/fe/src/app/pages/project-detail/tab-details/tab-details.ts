import { Component, Input } from '@angular/core';

interface Feature {
  name:        string;
  description: string;
  score:       number;
}

@Component({
  selector:    'bs-tab-details',
  templateUrl: './tab-details.html',
})
export class TabDetails {
  @Input() module_name = 'Access Control';
  @Input() avg_fcs = 58;
  @Input() features: Feature[] = [
    { name: 'Audit Logs',                score: 54, description: 'The Audit Logs feature in the Document Management System (DMS) provides a comprehensive record of all actions taken on documents within the system. This feature is essential for tracking user activiti' },
    { name: 'RBAC',                      score: 55, description: 'The Role-Based Access Control (RBAC) feature in the Document Management System (DMS) allows administrators to define user roles and permissions for accessing documents. This ensures that sensitive inf' },
    { name: 'Document Level Permission', score: 64, description: 'The "Document Level Permission" feature allows administrators to set specific access rights for individual documents within the Document Management System (DMS). This ensures that sensitive documents' },
  ];
}
