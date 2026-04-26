import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionService } from '../services/permission.service';

@Directive({
  selector: '[bsCan]',
})
export class CanDirective {
  private readonly tpl  = inject(TemplateRef<unknown>);
  private readonly vcr  = inject(ViewContainerRef);
  private readonly perm = inject(PermissionService);

  readonly bsCan = input.required<string>();

  private rendered = false;

  constructor() {
    effect(() => {
      const allowed = this.perm.can(this.bsCan());
      if (allowed && !this.rendered)  { this.vcr.createEmbeddedView(this.tpl); this.rendered = true; }
      if (!allowed && this.rendered)  { this.vcr.clear(); this.rendered = false; }
    });
  }
}
