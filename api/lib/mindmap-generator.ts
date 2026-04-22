import { query } from '../db.ts'

interface MindmapNode {
  name: string
  type: 'project' | 'module' | 'submodule' | 'feature' | 'page'
  children: MindmapNode[]
}

export async function generateMindmapData(projectId: string, moduleId?: number): Promise<MindmapNode> {
  const project = await query(`SELECT name FROM projects WHERE id = $1`, [projectId])
  const modules = await query(
    `SELECT id, name, parent_id, depth FROM modules WHERE project_id = $1 ORDER BY path, order_index`, [projectId]
  )
  const features = await query(
    `SELECT id, name, module_id FROM features WHERE project_id = $1 ORDER BY order_index`, [projectId]
  )
  const pages = await query(
    `SELECT id, name, page_type FROM pages WHERE project_id = $1 ORDER BY order_index`, [projectId]
  )

  const buildTree = (parentId: number | null): MindmapNode[] => {
    return modules.rows
      .filter(m => m.parent_id === parentId)
      .map(m => ({
        name: m.name,
        type: (m.depth === 0 ? 'module' : 'submodule') as MindmapNode['type'],
        children: [
          ...buildTree(m.id),
          ...features.rows.filter(f => f.module_id === m.id).map(f => ({
            name: f.name, type: 'feature' as const, children: [],
          })),
        ],
      }))
  }

  const pagesNode: MindmapNode = {
    name: 'Pages', type: 'module',
    children: pages.rows.map(p => ({ name: `${p.name} (${p.page_type || 'page'})`, type: 'page' as const, children: [] })),
  }

  return {
    name: project.rows[0]?.name || 'Project',
    type: 'project',
    children: [...buildTree(null), pagesNode],
  }
}

export function mindmapToHtml(root: MindmapNode): string {
  const dataJson = JSON.stringify(root).replace(/</g, '\\u003c')

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Mindmap — ${root.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;width:100%;overflow:hidden;font-family:'Inter',system-ui,sans-serif;background:#fafafa;color:#111;user-select:none}
  #toolbar{position:fixed;top:12px;left:12px;z-index:10;display:flex;gap:6px;align-items:center;background:#fff;padding:6px 10px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.08);font-size:12px}
  #toolbar button{border:1px solid #e5e7eb;background:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;color:#374151}
  #toolbar button:hover{background:#f3f4f6}
  #legend{position:fixed;top:12px;right:12px;z-index:10;background:#fff;padding:8px 12px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.08);font-size:11px;display:flex;gap:10px;align-items:center}
  #legend .dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:4px;vertical-align:middle}
  #canvas{position:absolute;inset:0;cursor:grab;overflow:hidden}
  #canvas.grabbing{cursor:grabbing}
  #stage{position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform}
  svg.edges{position:absolute;top:0;left:0;pointer-events:none;overflow:visible}
  .node{position:absolute;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid transparent;transition:box-shadow .15s,transform .15s}
  .node:hover{box-shadow:0 3px 10px rgba(0,0,0,.12);transform:translateY(-1px)}
  .node .caret{width:14px;height:14px;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:rgba(0,0,0,.08)}
  .node.collapsed .caret{background:rgba(0,0,0,.16)}
  .node .count{font-size:10px;opacity:.6;margin-left:2px}
  .node.project{background:#16a34a;color:#fff}
  .node.module{background:#dcfce7;color:#166534;border-color:#86efac}
  .node.submodule{background:#dbeafe;color:#1e40af;border-color:#93c5fd}
  .node.feature{background:#fef3c7;color:#92400e;border-color:#fcd34d}
  .node.page{background:#ede9fe;color:#6b21a8;border-color:#c4b5fd}
</style></head>
<body>
<div id="toolbar">
  <button id="expandAll">Expand all</button>
  <button id="collapseAll">Collapse all</button>
  <button id="reset">Reset view</button>
  <span style="color:#9ca3af;margin-left:6px">Drag canvas · wheel to zoom · click node to collapse</span>
</div>
<div id="legend">
  <span><i class="dot" style="background:#16a34a"></i>Project</span>
  <span><i class="dot" style="background:#86efac"></i>Module</span>
  <span><i class="dot" style="background:#93c5fd"></i>Sub-module</span>
  <span><i class="dot" style="background:#fcd34d"></i>Feature</span>
  <span><i class="dot" style="background:#c4b5fd"></i>Page</span>
</div>
<div id="canvas"><div id="stage"><svg class="edges" id="edges"></svg></div></div>
<script>
(function(){
  const DATA = ${dataJson};
  const H_GAP = 80, V_GAP = 14, NODE_H = 36;

  let uid = 0;
  function annotate(n){ n._id = ++uid; n._collapsed = n.type === 'project' ? false : (n.children.length > 0 && n.type === 'module' ? false : n.type !== 'project'); (n.children||[]).forEach(annotate); }
  // Start with project + first-level modules open, rest collapsed
  function initCollapse(n, depth=0){ n._id = ++uid; n._collapsed = depth >= 2; (n.children||[]).forEach(c=>initCollapse(c, depth+1)); }
  initCollapse(DATA);

  const stage = document.getElementById('stage');
  const canvas = document.getElementById('canvas');
  const svg = document.getElementById('edges');

  function measureText(text, font='500 13px Inter,system-ui,sans-serif'){
    const c = measureText._c || (measureText._c = document.createElement('canvas').getContext('2d'));
    c.font = font;
    return c.measureText(text).width;
  }

  // Layout: compute positions with horizontal tree. Returns bbox.
  function layout(node, x){
    const w = Math.min(320, Math.max(120, measureText(node.name) + 70));
    node._w = w;
    const visibleChildren = (!node._collapsed && node.children && node.children.length) ? node.children : [];
    if (!visibleChildren.length){
      node._x = x;
      node._yTop = 0;
      node._yBottom = NODE_H;
      node._y = 0;
      return { top: 0, bottom: NODE_H };
    }
    let yCursor = 0;
    let firstTop = 0, lastBottom = 0;
    for (let i=0;i<visibleChildren.length;i++){
      const child = visibleChildren[i];
      const childBBox = layout(child, x + w + H_GAP);
      // place child so its top aligns with yCursor
      const dy = yCursor - childBBox.top;
      shiftY(child, dy);
      if (i===0) firstTop = yCursor;
      lastBottom = yCursor + (childBBox.bottom - childBBox.top);
      yCursor = lastBottom + V_GAP;
    }
    const center = (firstTop + lastBottom) / 2 - NODE_H/2;
    node._x = x;
    node._y = center;
    return { top: Math.min(0, firstTop), bottom: Math.max(NODE_H, lastBottom) };
  }
  function shiftY(node, dy){
    node._y += dy;
    if (!node._collapsed && node.children) node.children.forEach(c=>shiftY(c, dy));
  }

  function descendants(n, out=[]){
    out.push(n);
    if (!n._collapsed && n.children) n.children.forEach(c=>descendants(c, out));
    return out;
  }
  function countDescendants(n){
    if (!n.children) return 0;
    let c = n.children.length;
    for (const k of n.children) c += countDescendants(k);
    return c;
  }

  function render(){
    stage.querySelectorAll('.node').forEach(e=>e.remove());
    svg.innerHTML = '';
    layout(DATA, 40);

    const all = descendants(DATA);
    let minY = Infinity, maxY = -Infinity, maxX = 0;
    all.forEach(n=>{ minY = Math.min(minY, n._y); maxY = Math.max(maxY, n._y + NODE_H); maxX = Math.max(maxX, n._x + n._w); });
    const offY = 40 - minY;

    all.forEach(n=>{
      const el = document.createElement('div');
      el.className = 'node ' + n.type + (n._collapsed && (n.children && n.children.length) ? ' collapsed' : '');
      el.style.left = n._x + 'px';
      el.style.top  = (n._y + offY) + 'px';
      el.style.minWidth = n._w + 'px';
      const hasKids = n.children && n.children.length;
      const caret = hasKids ? '<span class="caret">'+(n._collapsed?'+':'−')+'</span>' : '';
      const count = hasKids ? '<span class="count">'+countDescendants(n)+'</span>' : '';
      el.innerHTML = caret + '<span>'+escapeHtml(n.name)+'</span>' + count;
      el.addEventListener('click', (e)=>{ e.stopPropagation(); if (hasKids){ n._collapsed = !n._collapsed; render(); } });
      stage.appendChild(el);
    });

    // edges
    const ns = 'http://www.w3.org/2000/svg';
    svg.setAttribute('width',  (maxX + 200)+'');
    svg.setAttribute('height', (maxY - minY + 80)+'');
    function drawEdge(a, b){
      const x1 = a._x + a._w, y1 = a._y + offY + NODE_H/2;
      const x2 = b._x,        y2 = b._y + offY + NODE_H/2;
      const mx = (x1 + x2) / 2;
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M '+x1+' '+y1+' C '+mx+' '+y1+', '+mx+' '+y2+', '+x2+' '+y2);
      path.setAttribute('stroke', '#cbd5e1');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
    }
    function walk(n){
      if (!n._collapsed && n.children){
        n.children.forEach(c=>{ drawEdge(n, c); walk(c); });
      }
    }
    walk(DATA);
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Pan & zoom
  let tx = 0, ty = 0, scale = 1;
  function apply(){ stage.style.transform = 'translate('+tx+'px,'+ty+'px) scale('+scale+')'; }
  let dragging = false, sx = 0, sy = 0;
  canvas.addEventListener('mousedown', e=>{ dragging = true; sx = e.clientX - tx; sy = e.clientY - ty; canvas.classList.add('grabbing'); });
  window.addEventListener('mousemove', e=>{ if (!dragging) return; tx = e.clientX - sx; ty = e.clientY - sy; apply(); });
  window.addEventListener('mouseup', ()=>{ dragging = false; canvas.classList.remove('grabbing'); });
  canvas.addEventListener('wheel', e=>{
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const newScale = Math.min(2.5, Math.max(0.25, scale * (1 + delta)));
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    tx = cx - (cx - tx) * (newScale / scale);
    ty = cy - (cy - ty) * (newScale / scale);
    scale = newScale;
    apply();
  }, { passive: false });

  function expandAll(n){ n._collapsed = false; (n.children||[]).forEach(expandAll); }
  function collapseAll(n, depth=0){ if (depth>0) n._collapsed = true; (n.children||[]).forEach(c=>collapseAll(c, depth+1)); }
  document.getElementById('expandAll').addEventListener('click', ()=>{ expandAll(DATA); render(); });
  document.getElementById('collapseAll').addEventListener('click', ()=>{ collapseAll(DATA); render(); });
  document.getElementById('reset').addEventListener('click', ()=>{ tx = 40; ty = 40; scale = 1; apply(); });

  tx = 40; ty = 40; apply();
  render();
})();
</script>
</body></html>`
}
