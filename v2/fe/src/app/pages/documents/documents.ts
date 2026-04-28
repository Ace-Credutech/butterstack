import { Component, inject, signal, computed } from '@angular/core';
import { Header }          from '../../components/organisms/header/header';
import { DocumentsPanel }  from '../../components/organisms/documents-panel/documents-panel';
import { GlobalService }   from '../../services/global.service';

type ScopeTab = 'org' | 'user';

@Component({
  selector:    'bs-documents',
  imports:     [Header, DocumentsPanel],
  templateUrl: './documents.html',
})
export class Documents {
  protected readonly global      = inject(GlobalService);
  protected readonly active_tab  = signal<ScopeTab>('org');

  protected readonly entity_type = computed(() => this.active_tab());
  protected readonly entity_id   = computed((): string | null => {
    const tab = this.active_tab();
    if (tab === 'org')  return this.global.active_org()?.id ?? null;
    if (tab === 'user') return this.global.current_user()?.id ?? null;
    return null;
  });

  protected set_tab(tab: ScopeTab) { this.active_tab.set(tab); }
}
