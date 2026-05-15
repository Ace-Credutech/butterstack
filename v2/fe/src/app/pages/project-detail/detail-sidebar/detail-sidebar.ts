import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';

interface TreeNode {
  id:           string;
  name:         string;
  depth:        number;
  has_children: boolean;
  score?:       number;
  badge?:       number;
  dot_color?:   string;
  parent_id?:   string;
}

interface RawNode {
  id:        string;
  name:      string;
  type:      'folder' | 'leaf';
  depth:     number;
  score?:    number;
  badge?:    number;
  dot_color?: string;
  children?: RawNode[];
}

@Component({
  selector:    'bs-detail-sidebar',
  imports:     [NgClass],
  templateUrl: './detail-sidebar.html',
})
export class DetailSidebar implements OnInit {
  @Input() project_name = '';
  @Input() tree: RawNode[] = [];
  @Input() selected_id = '';
  @Output() select = new EventEmitter<string>();

  expanded: string[] = [];
  flat_tree: TreeNode[] = [];

  private active_folder_ids = new Set(['f1']);

  ngOnInit() {
    this.expand_all(this.tree);
    this.build_flat_tree();
  }

  private expand_all(nodes: RawNode[]) {
    for (const n of nodes) {
      if (n.children && n.children.length) {
        this.expanded.push(n.id);
        this.expand_all(n.children);
      }
    }
  }

  private build_flat_tree() {
    this.flat_tree = [];
    const flatten = (nodes: RawNode[], parent_id?: string) => {
      for (const n of nodes) {
        const has_children = !!(n.children && n.children.length);
        this.flat_tree.push({
          id: n.id, name: n.name, depth: n.depth,
          has_children, score: n.score, badge: n.badge,
          dot_color: n.dot_color, parent_id,
        });
        if (has_children && this.expanded.includes(n.id)) {
          flatten(n.children!, n.id);
        }
      }
    };
    flatten(this.tree);
  }

  is_expanded(id: string): boolean {
    return this.expanded.includes(id);
  }

  is_active_folder(id: string): boolean {
    return this.active_folder_ids.has(id);
  }

  on_click(node: TreeNode) {
    if (node.has_children) {
      this.toggle_expand(node.id);
    } else {
      this.select.emit(node.id);
    }
  }

  toggle_expand(id: string) {
    if (this.expanded.includes(id)) {
      this.expanded = this.expanded.filter(e => e !== id);
    } else {
      this.expanded.push(id);
    }
    this.build_flat_tree();
  }
}
