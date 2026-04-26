import { DestroyRef, Directive, ElementRef, inject, input, OnDestroy } from '@angular/core';

const make_tooltip_el = (text: string, theme: 'dark' | 'light'): HTMLDivElement => {
  const el = document.createElement('div');
  el.textContent = text;
  el.className = [
    'fixed z-[60] px-2 py-1 text-[11px] font-medium rounded-md shadow-lg pointer-events-none transition-opacity duration-100 opacity-0',
    theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border border-gray-200',
  ].join(' ');
  el.style.transform = 'translate(-50%, -100%)';
  return el;
};

const position_tooltip = (el: HTMLDivElement, host: HTMLElement, gap: number) => {
  const rect = host.getBoundingClientRect();
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top  = `${rect.top - gap}px`;
};

@Directive({
  selector: '[bsTooltip]',
})
export class TooltipDirective implements OnDestroy {
  private readonly host    = inject(ElementRef<HTMLElement>);
  private readonly destroy = inject(DestroyRef);

  readonly bsTooltip      = input.required<string>();
  readonly tooltipTheme   = input<'dark' | 'light'>('dark');
  readonly tooltipDelayMs = input<number>(120);

  private tip: HTMLDivElement | null = null;
  private timer: any = null;

  constructor() {
    const el = this.host.nativeElement;
    const enter = () => this.schedule_show();
    const leave = () => this.cancel_and_hide();
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    el.addEventListener('focus', enter);
    el.addEventListener('blur', leave);
    this.destroy.onDestroy(() => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
      el.removeEventListener('focus', enter);
      el.removeEventListener('blur', leave);
      this.cancel_and_hide();
    });
  }

  private schedule_show() {
    this.cancel_and_hide();
    this.timer = setTimeout(() => this.show(), this.tooltipDelayMs());
  }

  private show() {
    const text = this.bsTooltip();
    if (!text) return;
    this.tip = make_tooltip_el(text, this.tooltipTheme());
    document.body.appendChild(this.tip);
    position_tooltip(this.tip, this.host.nativeElement, 8);
    requestAnimationFrame(() => { if (this.tip) this.tip.style.opacity = '1'; });
  }

  private cancel_and_hide() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.tip) { this.tip.remove(); this.tip = null; }
  }

  ngOnDestroy() { this.cancel_and_hide(); }
}
