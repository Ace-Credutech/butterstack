import { Component, inject } from '@angular/core';
import { Header }          from '../../components/organisms/header/header';
import { DocumentsPanel }  from '../../components/organisms/documents-panel/documents-panel';
import { GlobalService }   from '../../services/global.service';

@Component({
  selector:    'bs-documents',
  imports:     [Header, DocumentsPanel],
  templateUrl: './documents.html',
})
export class Documents {
  protected readonly global = inject(GlobalService);
}
