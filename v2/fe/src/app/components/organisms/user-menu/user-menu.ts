import { Component, computed, DestroyRef, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { GlobalService } from '../../../services/global.service';
import { Avatar } from '../../atoms/avatar/avatar';
import { Chip } from '../../atoms/chip/chip';

const role_tone = (slug: string | undefined): 'violet' | 'green' | 'slate' | 'blue' => {
  if (slug === 'super_admin')     return 'violet';
  if (slug === 'product_manager') return 'green';
  if (slug === 'member')          return 'slate';
  return 'blue';
};

@Component({
  selector:    'bs-user-menu',
  imports:     [Avatar, Chip],
  templateUrl: './user-menu.html',
})
export class UserMenu {
  private readonly auth   = inject(AuthService);
  private readonly global = inject(GlobalService);
  private readonly router = inject(Router);
  private readonly host   = inject(ElementRef<HTMLElement>);

  readonly open = signal(false);
  readonly user = computed(() => this.global.current_user());

  protected role_tone = role_tone;

  toggle()  { this.open.update(v => !v); }
  close()   { this.open.set(false); }

  async sign_out() {
    this.close();
    await this.auth.logout();
    this.global.clear();
    this.router.navigate(['/']);
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
