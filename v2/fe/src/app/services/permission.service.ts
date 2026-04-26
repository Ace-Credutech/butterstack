import { computed, inject, Injectable } from '@angular/core';
import { GlobalService } from './global.service';

type PermissionTree = Record<string, unknown>;

const read_at_path = (tree: PermissionTree | null, segments: string[]): unknown => {
  if (!tree) return undefined;
  let node: unknown = tree;
  for (const seg of segments) {
    if (!node || typeof node !== 'object') return undefined;
    const obj = node as Record<string, unknown>;
    if (obj['*'] === true) return true;
    node = obj[seg];
  }
  return node;
};

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly global = inject(GlobalService);

  readonly tree = computed<PermissionTree | null>(() => {
    const role = this.global.current_user()?.role;
    return (role?.permissions as PermissionTree | undefined) ?? null;
  });

  can(path: string): boolean {
    const value = read_at_path(this.tree(), path.split('.'));
    return value === true;
  }

  any(paths: string[]): boolean {
    return paths.some(p => this.can(p));
  }

  all(paths: string[]): boolean {
    return paths.every(p => this.can(p));
  }
}
