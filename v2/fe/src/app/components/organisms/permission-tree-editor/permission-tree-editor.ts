import { Component, computed, input, model } from '@angular/core';
import { Checkbox } from '../../atoms/checkbox/checkbox';
import { Chip } from '../../atoms/chip/chip';

type PermNode = { key: string; label: string; children?: PermNode[]; leaf?: boolean };

const default_tree: PermNode[] = [
  { key: 'projects', label: 'Projects', children: [
    { key: 'create', label: 'Create',     leaf: true },
    { key: 'read',   label: 'Read',       leaf: true },
    { key: 'update', label: 'Update',     leaf: true },
    { key: 'delete', label: 'Delete',     leaf: true },
  ] },
  { key: 'modules', label: 'Modules', children: [
    { key: 'create', label: 'Create',     leaf: true },
    { key: 'read',   label: 'Read',       leaf: true },
    { key: 'update', label: 'Update',     leaf: true },
    { key: 'delete', label: 'Delete',     leaf: true },
  ] },
  { key: 'versions', label: 'Versions', children: [
    { key: 'create',  label: 'Create',    leaf: true },
    { key: 'read',    label: 'Read',      leaf: true },
    { key: 'update',  label: 'Update',    leaf: true },
    { key: 'delete',  label: 'Delete',    leaf: true },
    { key: 'approve', label: 'Approve',   leaf: true },
  ] },
  { key: 'conversations', label: 'Conversations', children: [
    { key: 'create',     label: 'Create',          leaf: true },
    { key: 'read',       label: 'Read',            leaf: true },
    { key: 'update',     label: 'Update',          leaf: true },
    { key: 'update_own', label: 'Update own only', leaf: true },
    { key: 'delete',     label: 'Delete',          leaf: true },
  ] },
  { key: 'admin', label: 'Admin', children: [
    { key: 'users', label: 'Users', children: [
      { key: 'read',   label: 'View users',        leaf: true },
      { key: 'update', label: 'Update users',      leaf: true },
      { key: 'invite', label: 'Invite users',      leaf: true },
    ] },
    { key: 'roles', label: 'Roles', children: [
      { key: 'read',   label: 'View roles',        leaf: true },
      { key: 'update', label: 'Update roles',      leaf: true },
      { key: 'assign', label: 'Assign roles',      leaf: true },
    ] },
  ] },
  { key: 'role', label: 'Role management', children: [
    { key: 'promote_pm', label: 'Promote to product manager', leaf: true },
  ] },
];

const get_at_path = (tree: any, segments: string[]): unknown => {
  let n: any = tree;
  for (const s of segments) {
    if (!n || typeof n !== 'object') return undefined;
    n = n[s];
  }
  return n;
};

const set_at_path = (tree: any, segments: string[], value: any): any => {
  const next = JSON.parse(JSON.stringify(tree ?? {}));
  let cursor = next;
  for (let i = 0; i < segments.length - 1; i++) {
    const s = segments[i];
    if (!cursor[s] || typeof cursor[s] !== 'object') cursor[s] = {};
    cursor = cursor[s];
  }
  cursor[segments[segments.length - 1]] = value;
  return next;
};

const unset_at_path = (tree: any, segments: string[]): any => {
  const next = JSON.parse(JSON.stringify(tree ?? {}));
  let cursor = next;
  for (let i = 0; i < segments.length - 1; i++) {
    if (!cursor[segments[i]]) return next;
    cursor = cursor[segments[i]];
  }
  delete cursor[segments[segments.length - 1]];
  return next;
};

const flatten_leaves = (nodes: PermNode[], prefix: string[] = []): string[][] => {
  const out: string[][] = [];
  for (const n of nodes) {
    const path = [...prefix, n.key];
    if (n.leaf)         out.push(path);
    if (n.children)     out.push(...flatten_leaves(n.children, path));
  }
  return out;
};

@Component({
  selector:    'bs-permission-tree-editor',
  imports:     [Checkbox, Chip],
  templateUrl: './permission-tree-editor.html',
})
export class PermissionTreeEditor {
  readonly value     = model.required<Record<string, unknown>>();
  readonly disabled  = input(false);

  readonly tree   = computed(() => default_tree);
  readonly leaves = computed(() => flatten_leaves(this.tree()));

  readonly is_wildcard = computed(() => this.value()?.['*'] === true);

  readonly enabled_count = computed(() => {
    if (this.is_wildcard()) return this.leaves().length;
    return this.leaves().filter(p => get_at_path(this.value(), p) === true).length;
  });

  protected segments = (path: string[]) => path.join('.');

  protected is_set(path: string[]): boolean {
    if (this.is_wildcard()) return true;
    return get_at_path(this.value(), path) === true;
  }

  protected toggle_leaf(path: string[]) {
    if (this.disabled()) return;
    const current = this.is_set(path);
    if (current) this.value.set(unset_at_path(this.value(), path));
    else         this.value.set(set_at_path(this.value(), path, true));
  }

  protected node_state(node: PermNode, prefix: string[]): 'all' | 'some' | 'none' {
    if (this.is_wildcard()) return 'all';
    const path = [...prefix, node.key];
    if (node.leaf) return this.is_set(path) ? 'all' : 'none';
    const leaf_paths = flatten_leaves(node.children ?? [], path);
    const checked = leaf_paths.filter(lp => get_at_path(this.value(), lp) === true).length;
    if (checked === 0)                  return 'none';
    if (checked === leaf_paths.length)  return 'all';
    return 'some';
  }

  protected toggle_group(node: PermNode, prefix: string[]) {
    if (this.disabled()) return;
    const path = [...prefix, node.key];
    const leaf_paths = node.leaf ? [path] : flatten_leaves(node.children ?? [], path);
    const state = this.node_state(node, prefix);
    let next = this.value();
    if (state === 'all') for (const lp of leaf_paths) next = unset_at_path(next, lp);
    else                  for (const lp of leaf_paths) next = set_at_path(next, lp, true);
    this.value.set(next);
  }

  protected child_prefix = (node: PermNode, prefix: string[]) => [...prefix, node.key];
}
