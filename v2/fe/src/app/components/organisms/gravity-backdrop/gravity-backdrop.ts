import { DestroyRef, Component, ElementRef, inject, input, NgZone, OnInit, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

type Dot = { home_x: number; home_y: number; x: number; y: number; tx: number; ty: number };

const distance = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clamp01  = (n: number): number => Math.max(0, Math.min(1, n));
const ease_out = (t: number): number => 1 - Math.pow(1 - t, 3);
const lerp     = (from: number, to: number, alpha: number): number => from + (to - from) * alpha;
const reduced_motion = (): boolean => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const build_grid = (width: number, height: number, cell: number): Dot[] => {
  const cols = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;
  const dots: Dot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cell;
      const y = r * cell;
      dots.push({ home_x: x, home_y: y, x, y, tx: x, ty: y });
    }
  }
  return dots;
};

@Component({
  selector:    'bs-gravity-backdrop',
  templateUrl: './gravity-backdrop.html',
  styleUrl:    './gravity-backdrop.scss',
})
export class GravityBackdrop implements OnInit {
  private readonly zone    = inject(NgZone);
  private readonly destroy = inject(DestroyRef);

  readonly canvas_ref = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly cell_size       = input(40);     // grid spacing in px
  readonly radius          = input(180);    // cursor influence radius
  readonly strength        = input(10);     // peak pull (px) at cursor center
  readonly dot_size        = input(1.1);    // base dot radius
  readonly dot_size_peak   = input(1.6);    // dot radius near cursor
  readonly damping         = input(0.16);   // lerp speed per frame
  readonly base_color      = input('15, 23, 42');          // slate-900 rgb
  readonly base_alpha      = input(0.08);
  readonly accent_color    = input('34, 197, 94');         // green-500 rgb
  readonly accent_alpha    = input(0.28);

  private ctx: CanvasRenderingContext2D | null = null;
  private dots: Dot[] = [];
  private cursor_x = -9999;
  private cursor_y = -9999;
  private raf: number | null = null;
  private width  = 0;
  private height = 0;
  private dpr    = 1;

  ngOnInit() {
    if (reduced_motion()) return;
    this.bind_canvas();
    this.bind_resize();
    this.bind_pointer();
    this.draw();
  }

  private bind_canvas() {
    const canvas = this.canvas_ref().nativeElement;
    this.ctx = canvas.getContext('2d');
    this.resize_canvas();
  }

  private bind_resize() {
    const host = this.canvas_ref().nativeElement.parentElement!;
    const ro = new ResizeObserver(() => this.resize_canvas());
    ro.observe(host);
    this.destroy.onDestroy(() => ro.disconnect());
  }

  private bind_pointer() {
    this.zone.runOutsideAngular(() => {
      fromEvent<PointerEvent>(window, 'pointermove')
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe(e => this.on_pointer_move(e));
      fromEvent<PointerEvent>(document, 'pointerleave')
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe(() => { this.cursor_x = -9999; this.cursor_y = -9999; this.ensure_loop(); });
    });
  }

  private on_pointer_move(e: PointerEvent) {
    const rect = this.canvas_ref().nativeElement.getBoundingClientRect();
    this.cursor_x = e.clientX - rect.left;
    this.cursor_y = e.clientY - rect.top;
    this.ensure_loop();
  }

  private resize_canvas() {
    const canvas = this.canvas_ref().nativeElement;
    const host   = canvas.parentElement!;
    const rect   = host.getBoundingClientRect();
    this.dpr     = window.devicePixelRatio || 1;
    this.width   = rect.width;
    this.height  = rect.height;
    canvas.width  = Math.floor(this.width  * this.dpr);
    canvas.height = Math.floor(this.height * this.dpr);
    canvas.style.width  = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.dots = build_grid(this.width, this.height, this.cell_size());
    this.draw();
  }

  private ensure_loop() {
    if (this.raf !== null) return;
    this.zone.runOutsideAngular(() => {
      const tick = () => {
        const settled = this.step();
        this.draw();
        if (settled) { this.raf = null; return; }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    });
  }

  private step(): boolean {
    const r = this.radius();
    const s = this.strength();
    const k = this.damping();
    let max_delta = 0;
    for (const dot of this.dots) {
      const dx = this.cursor_x - dot.home_x;
      const dy = this.cursor_y - dot.home_y;
      const d  = Math.hypot(dx, dy);
      if (d < r && d > 0.0001) {
        const falloff = ease_out(1 - clamp01(d / r));
        const push    = falloff * s;
        dot.tx = dot.home_x + (dx / d) * push;
        dot.ty = dot.home_y + (dy / d) * push;
      } else {
        dot.tx = dot.home_x;
        dot.ty = dot.home_y;
      }
      dot.x = lerp(dot.x, dot.tx, k);
      dot.y = lerp(dot.y, dot.ty, k);
      const ddx = dot.x - dot.tx;
      const ddy = dot.y - dot.ty;
      const delta = Math.abs(ddx) + Math.abs(ddy);
      if (delta > max_delta) max_delta = delta;
    }
    return max_delta < 0.05;
  }

  private draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    const r     = this.radius();
    const base  = this.base_color().split(',').map(n => parseFloat(n));
    const acc   = this.accent_color().split(',').map(n => parseFloat(n));
    const bA    = this.base_alpha();
    const aA    = this.accent_alpha();
    const rMin  = this.dot_size();
    const rMax  = this.dot_size_peak();
    ctx.clearRect(0, 0, this.width, this.height);
    for (const dot of this.dots) {
      const d = distance(this.cursor_x, this.cursor_y, dot.home_x, dot.home_y);
      const t = d < r ? ease_out(1 - clamp01(d / r)) : 0;
      const radius = lerp(rMin, rMax, t);
      const alpha  = lerp(bA, aA, t);
      const cr = Math.round(lerp(base[0], acc[0], t));
      const cg = Math.round(lerp(base[1], acc[1], t));
      const cb = Math.round(lerp(base[2], acc[2], t));
      ctx.beginPath();
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha.toFixed(3)})`;
      ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
