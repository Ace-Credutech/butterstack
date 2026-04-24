import { DestroyRef, Directive, ElementRef, inject, input, NgZone, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge } from 'rxjs';

type Vec = { x: number; y: number };

const ZERO: Vec = { x: 0, y: 0 };

const distance       = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01        = (n: number): number      => Math.max(0, Math.min(1, n));
const ease_out       = (t: number): number      => 1 - Math.pow(1 - t, 3);
const lerp           = (from: number, to: number, alpha: number) => from + (to - from) * alpha;
const reduced_motion = (): boolean => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const element_center = (el: HTMLElement): Vec => {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const proximity = (cursor: Vec, center: Vec, radius: number): number => {
  const d = distance(cursor, center);
  if (d > radius) return 0;
  return ease_out(1 - clamp01(d / radius));
};

const dent_translate = (cursor: Vec, center: Vec, t: number, strength: number): Vec => ({
  x: (cursor.x - center.x) * t * strength,
  y: (cursor.y - center.y) * t * strength,
});

const apply_press = (el: HTMLElement, offset: Vec, scale: number, brightness: number) => {
  el.style.transform = `translate3d(${offset.x.toFixed(2)}px, ${offset.y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
  el.style.filter    = `brightness(${brightness.toFixed(3)})`;
};

@Directive({
  selector: '[bsGravity]',
})
export class GravityDirective implements OnInit {
  private readonly host    = inject(ElementRef<HTMLElement>);
  private readonly zone    = inject(NgZone);
  private readonly destroy = inject(DestroyRef);

  readonly radius       = input(140);    // px — how far from cursor the dent reaches
  readonly press_scale  = input(0.99);   // peak scale at cursor center (dent depth)
  readonly dent_pull    = input(0.012);  // 0..1 — fabric translate toward cursor
  readonly dim          = input(0.995);  // brightness at peak dent (1 = unchanged)
  readonly damping      = input(0.22);   // lerp speed — higher = snappier

  private target  = { ...ZERO };
  private current = { ...ZERO };
  private target_scale  = 1;
  private current_scale = 1;
  private target_bright  = 1;
  private current_bright = 1;
  private raf: number | null = null;

  ngOnInit() {
    if (reduced_motion()) return;
    this.prepare_host();
    this.bind_events();
  }

  private prepare_host() {
    const el = this.host.nativeElement;
    el.style.willChange = 'transform, filter';
    el.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), filter 0.4s ease';
  }

  private bind_events() {
    this.zone.runOutsideAngular(() => {
      const move  = fromEvent<PointerEvent>(window, 'pointermove');
      const leave = fromEvent<PointerEvent>(document, 'pointerleave');
      const blur  = fromEvent(window, 'blur');

      move.pipe(takeUntilDestroyed(this.destroy)).subscribe(e => this.on_pointer_move(e));
      merge(leave, blur).pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.reset_target());
    });
  }

  private on_pointer_move(e: PointerEvent) {
    const cursor = { x: e.clientX, y: e.clientY };
    const center = element_center(this.host.nativeElement);
    const t      = proximity(cursor, center, this.radius());
    const offset = dent_translate(cursor, center, t, this.dent_pull());
    const scale  = lerp(1, this.press_scale(), t);
    const bright = lerp(1, this.dim(), t);
    this.update_target(offset, scale, bright);
    this.ensure_loop();
  }

  private update_target(offset: Vec, scale: number, bright: number) {
    this.target        = offset;
    this.target_scale  = scale;
    this.target_bright = bright;
  }

  private reset_target() {
    this.update_target(ZERO, 1, 1);
    this.ensure_loop();
  }

  private ensure_loop() {
    if (this.raf !== null) return;
    const tick = () => {
      const done = this.step();
      if (done) { this.raf = null; return; }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private step(): boolean {
    const k = this.damping();
    this.current.x      = lerp(this.current.x,      this.target.x,      k);
    this.current.y      = lerp(this.current.y,      this.target.y,      k);
    this.current_scale  = lerp(this.current_scale,  this.target_scale,  k);
    this.current_bright = lerp(this.current_bright, this.target_bright, k);
    apply_press(this.host.nativeElement, this.current, this.current_scale, this.current_bright);
    return this.settled();
  }

  private settled(): boolean {
    const offset_delta = Math.hypot(this.target.x - this.current.x, this.target.y - this.current.y);
    const scale_delta  = Math.abs(this.target_scale  - this.current_scale);
    const bright_delta = Math.abs(this.target_bright - this.current_bright);
    const at_rest      = this.target.x === 0 && this.target.y === 0 && this.target_scale === 1;
    return offset_delta < 0.05 && scale_delta < 0.001 && bright_delta < 0.001 && at_rest;
  }
}
