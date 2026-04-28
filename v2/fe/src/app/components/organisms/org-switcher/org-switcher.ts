import { Component, computed, ElementRef, HostListener, inject, signal } from '@angular/core';
import { GlobalService } from '../../../services/global.service';

@Component({
  selector:    'bs-org-switcher',
  imports:     [],
  templateUrl: './org-switcher.html',
})
export class OrgSwitcher {
  private readonly global = inject(GlobalService);
  private readonly host   = inject(ElementRef<HTMLElement>);

  readonly open       = signal(false);
  readonly active_org = computed(() => this.global.active_org());
  readonly all_orgs   = computed(() => this.global.current_user()?.orgs ?? []);

  toggle() { this.open.update(v => !v); }
  close()  { this.open.set(false); }

  select(org_id: string): void {
    this.global.switch_org(org_id);
    this.close();
  }

  @HostListener('document:click', ['$event'])
  on_doc_click(e: MouseEvent) {
    if (!this.open()) return;
    if (this.host.nativeElement.contains(e.target as Node)) return;
    this.close();
  }

  @HostListener('document:keydown.escape')
  on_escape() { this.close(); }
}
