type PermissionTree = Record<string, unknown>;

const read_at_path = (tree: PermissionTree, segments: string[]): unknown => {
  let node: unknown = tree;
  for (const seg of segments) {
    if (!node || typeof node !== 'object') return undefined;
    const obj = node as Record<string, unknown>;
    if (obj['*'] === true) return true;
    node = obj[seg];
  }
  return node;
};

export const has_permission = (user: any, required: string): boolean => {
  const tree = extract_permission_tree(user);
  if (!tree) return false;
  const segments = required.split('.');
  const value    = read_at_path(tree, segments);
  return value === true;
};

export const has_all_permissions = (user: any, required: string[] | undefined): boolean => {
  if (!required || required.length === 0) return true;
  return required.every(p => has_permission(user, p));
};

const extract_permission_tree = (user: any): PermissionTree | null => {
  const role = user?.Role || user?.role;
  if (!role) return null;
  const permissions = role.permissions_json || role.permissions;
  if (!permissions || typeof permissions !== 'object') return null;
  return permissions as PermissionTree;
};
