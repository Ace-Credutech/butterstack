import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';

interface MindmapNode {
  id:        string;
  label:     string;
  type:      'root' | 'module' | 'submodule' | 'feature' | 'page';
  count?:    number;
  expanded:  boolean;
  children:  MindmapNode[];
  // computed
  x:         number;
  y:         number;
  w:         number;
  h:         number;
  leaf_count: number;
}

interface Line {
  x1: number; y1: number; x2: number; y2: number;
}

const ROW_HEIGHT = 42;
const DEPTH_X = [60, 320, 540];
const NODE_H: Record<string, number> = { root: 42, module: 36, submodule: 32, feature: 32, page: 32 };
const NODE_W: Record<string, number> = { root: 0, module: 0, submodule: 0, feature: 0, page: 0 };

@Component({
  selector:    'bs-tab-mindmap',
  templateUrl: './tab-mindmap.html',
  styles: [`:host { display:flex; flex-direction:column; flex:1; height:100%; overflow:hidden; }`],
})
export class TabMindmap implements AfterViewInit, OnDestroy {
  @Input() project_name = 'Document Management System';
  @ViewChild('canvas_wrap') canvas_wrap!: ElementRef<HTMLDivElement>;

  pan_x = 80;
  pan_y = 40;
  zoom = 1;
  dragging = false;
  private drag_sx = 0;
  private drag_sy = 0;
  private pan_sx = 0;
  private pan_sy = 0;

  root!: MindmapNode;
  flat: MindmapNode[] = [];
  lines: Line[] = [];
  canvas_h = 2000;

  private ev_wheel: any;
  private ev_md: any;
  private ev_mm: any;
  private ev_mu: any;

  legend = [
    { color: '#16a34a', label: 'Project' },
    { color: '#4ade80', label: 'Module' },
    { color: '#93c5fd', label: 'Sub-module' },
    { color: '#93c5fd', label: 'Feature' },
    { color: '#c4b5fd', label: 'Page' },
  ];

  ngAfterViewInit() {
    this.build_tree();
    this.recalc();
    this.bind();
  }

  ngOnDestroy() { this.unbind(); }

  private build_tree() {
    this.root = {
      id: 'root', label: this.project_name, type: 'root', count: 45,
      expanded: true, x: 0, y: 0, w: 0, h: 0, leaf_count: 0,
      children: [
        {
          id: 'dm', label: 'Document Management', type: 'module', count: 31,
          expanded: true, x: 0, y: 0, w: 0, h: 0, leaf_count: 0,
          children: [
            { id: 'ac', label: 'Access Control', count: 3, type: 'submodule', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'ap', label: 'Admin Portal', count: 5, type: 'submodule', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'at', label: 'Audit Trail', count: 3, type: 'submodule', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'bdr', label: 'Backup & Disaster Recovery', count: 3, type: 'submodule', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'du', label: 'Document Upload', count: 2, type: 'submodule', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'notif', label: 'Notifications', count: 1, type: 'submodule', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'srch', label: 'Search', count: 3, type: 'submodule', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'wf', label: 'Workflow', count: 3, type: 'submodule', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
          ],
        },
        {
          id: 'search', label: 'Search', type: 'module', count: 1,
          expanded: true, x: 0, y: 0, w: 0, h: 0, leaf_count: 0,
          children: [
            { id: 'ds', label: 'Document Search', type: 'feature', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
          ],
        },
        {
          id: 'workflow', label: 'Workflow', type: 'module', count: 1,
          expanded: true, x: 0, y: 0, w: 0, h: 0, leaf_count: 0,
          children: [
            { id: 'aw', label: 'Approval Workflow', type: 'feature', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
          ],
        },
        {
          id: 'pages', label: 'Pages', type: 'module', count: 8,
          expanded: true, x: 0, y: 0, w: 0, h: 0, leaf_count: 0,
          children: [
            { id: 'p1', label: 'Workflow Management (dashboard)', type: 'page', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'p2', label: 'Backup & Disaster Recovery (settings)', type: 'page', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'p3', label: 'Document Upload (form)', type: 'page', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'p4', label: 'Audit Trail (list)', type: 'page', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'p5', label: 'Document Search (list)', type: 'page', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'p6', label: 'Notifications Settings (settings)', type: 'page', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'p7', label: 'Admin Portal (settings)', type: 'page', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
            { id: 'p8', label: 'Access Control Settings (settings)', type: 'page', expanded: false, children: [], x: 0, y: 0, w: 0, h: 0, leaf_count: 0 },
          ],
        },
      ],
    };
  }

  recalc() {
    this.count_leaves(this.root);
    const total_leaves = this.root.leaf_count;
    this.canvas_h = Math.max(total_leaves * ROW_HEIGHT + 120, 800);
    this.layout(this.root, 0, 0, total_leaves * ROW_HEIGHT);
    this.flat = [];
    this.collect(this.root);
    this.lines = [];
    this.collect_lines(this.root);
  }

  private count_leaves(n: MindmapNode): number {
    if (!n.expanded || n.children.length === 0) {
      n.leaf_count = 1;
      return 1;
    }
    let sum = 0;
    for (const c of n.children) sum += this.count_leaves(c);
    n.leaf_count = sum;
    return sum;
  }

  private layout(n: MindmapNode, depth: number, y_start: number, y_span: number) {
    n.x = DEPTH_X[Math.min(depth, DEPTH_X.length - 1)];
    n.h = NODE_H[n.type] || 32;

    if (!n.expanded || n.children.length === 0) {
      n.y = y_start + y_span / 2 - n.h / 2;
      return;
    }

    let cursor = y_start;
    for (const c of n.children) {
      const child_span = (c.leaf_count / n.leaf_count) * y_span;
      this.layout(c, depth + 1, cursor, child_span);
      cursor += child_span;
    }

    const first = n.children[0];
    const last = n.children[n.children.length - 1];
    const top = first.y + first.h / 2;
    const bottom = last.y + last.h / 2;
    n.y = (top + bottom) / 2 - n.h / 2;
  }

  private collect(n: MindmapNode) {
    this.flat.push(n);
    if (n.expanded) {
      for (const c of n.children) this.collect(c);
    }
  }

  private collect_lines(n: MindmapNode) {
    if (!n.expanded) return;
    const nw = this.node_w(n);
    for (const c of n.children) {
      this.lines.push({
        x1: n.x + nw, y1: n.y + n.h / 2,
        x2: c.x, y2: c.y + c.h / 2,
      });
      this.collect_lines(c);
    }
  }

  private node_w(n: MindmapNode): number {
    const len = n.label.length;
    const base = n.type === 'root' ? 16 : n.type === 'module' ? 14 : 13;
    const pad = n.type === 'root' ? 80 : n.type === 'module' ? 70 : 60;
    return len * (base * 0.58) + pad;
  }

  get_bezier(l: Line): string {
    const gap = l.x2 - l.x1;
    const cp = gap * 0.4;
    return `M ${l.x1} ${l.y1} C ${l.x1 + cp} ${l.y1}, ${l.x2 - cp} ${l.y2}, ${l.x2} ${l.y2}`;
  }

  toggle(n: MindmapNode, ev: Event) {
    ev.stopPropagation();
    if (n.children.length === 0 && n.type !== 'root') return;
    n.expanded = !n.expanded;
    this.recalc();
  }

  expand_all() {
    const walk = (n: MindmapNode) => { if (n.children.length) n.expanded = true; n.children.forEach(walk); };
    walk(this.root);
    this.recalc();
  }

  collapse_all() {
    const walk = (n: MindmapNode) => { if (n.children.length) n.expanded = false; n.children.forEach(walk); };
    this.root.children.forEach(walk);
    this.root.expanded = true;
    this.recalc();
  }

  reset_view() {
    this.pan_x = 80; this.pan_y = 40; this.zoom = 1;
    this.expand_all();
  }

  get transform(): string {
    return `translate(${this.pan_x}px, ${this.pan_y}px) scale(${this.zoom})`;
  }

  private bind() {
    const el = this.canvas_wrap?.nativeElement;
    if (!el) return;

    this.ev_wheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const zoom_factor = e.deltaY < 0 ? 1.2 : 0.8;
      const new_scale = Math.min(3, Math.max(0.2, this.zoom * zoom_factor));

      const rect = el.getBoundingClientRect();
      const mouse_x = e.clientX - rect.left;
      const mouse_y = e.clientY - rect.top;

      this.pan_x = mouse_x - (mouse_x - this.pan_x) * (new_scale / this.zoom);
      this.pan_y = mouse_y - (mouse_y - this.pan_y) * (new_scale / this.zoom);
      this.zoom = new_scale;
    };
    this.ev_md = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.mm-btn')) return;
      this.dragging = true;
      this.drag_sx = e.clientX; this.drag_sy = e.clientY;
      this.pan_sx = this.pan_x; this.pan_sy = this.pan_y;
    };
    this.ev_mm = (e: MouseEvent) => {
      if (!this.dragging) return;
      this.pan_x = this.pan_sx + (e.clientX - this.drag_sx);
      this.pan_y = this.pan_sy + (e.clientY - this.drag_sy);
    };
    this.ev_mu = () => { this.dragging = false; };

    el.addEventListener('wheel', this.ev_wheel, { passive: false });
    el.addEventListener('mousedown', this.ev_md);
    window.addEventListener('mousemove', this.ev_mm);
    window.addEventListener('mouseup', this.ev_mu);
  }

  private unbind() {
    const el = this.canvas_wrap?.nativeElement;
    if (el) { el.removeEventListener('wheel', this.ev_wheel); el.removeEventListener('mousedown', this.ev_md); }
    window.removeEventListener('mousemove', this.ev_mm);
    window.removeEventListener('mouseup', this.ev_mu);
  }
}
