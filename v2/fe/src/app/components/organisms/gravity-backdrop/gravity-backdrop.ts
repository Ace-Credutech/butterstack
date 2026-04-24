import { DestroyRef, Component, ElementRef, inject, input, NgZone, OnInit, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

const set_cursor_vars = (el: HTMLElement, x: number, y: number) => {
  el.style.setProperty('--mx', `${x}px`);
  el.style.setProperty('--my', `${y}px`);
};

@Component({
  selector:    'bs-gravity-backdrop',
  templateUrl: './gravity-backdrop.html',
  styleUrl:    './gravity-backdrop.scss',
})
export class GravityBackdrop implements OnInit {
  private readonly zone    = inject(NgZone);
  private readonly destroy = inject(DestroyRef);

  readonly layer = viewChild.required<ElementRef<HTMLDivElement>>('layer');

  readonly pattern    = input<'dots' | 'grid'>('dots');
  readonly radius     = input(260);    // px of the cursor spotlight
  readonly accent     = input('rgba(34,197,94,0.22)');  // green-500 @ 22%
  readonly base_dot   = input('rgba(15,23,42,0.06)');   // slate-900 @ 6%
  readonly cell_size  = input(26);     // px between pattern units

  ngOnInit() {
    this.apply_pattern_vars();
    this.bind_cursor();
  }

  private apply_pattern_vars() {
    const el = this.layer().nativeElement;
    el.style.setProperty('--radius',    `${this.radius()}px`);
    el.style.setProperty('--accent',    this.accent());
    el.style.setProperty('--base-dot',  this.base_dot());
    el.style.setProperty('--cell-size', `${this.cell_size()}px`);
    el.dataset['pattern'] = this.pattern();
  }

  private bind_cursor() {
    this.zone.runOutsideAngular(() => {
      fromEvent<PointerEvent>(window, 'pointermove')
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe(e => this.on_move(e));
    });
  }

  private on_move(e: PointerEvent) {
    const el   = this.layer().nativeElement;
    const rect = el.getBoundingClientRect();
    set_cursor_vars(el, e.clientX - rect.left, e.clientY - rect.top);
  }
}
