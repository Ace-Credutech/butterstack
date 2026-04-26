type FieldSpec<T, K extends keyof T = keyof T> = {
  next:          T[K];
  original:      T[K];
  out_key?:      string;
  transform?:    (v: T[K]) => unknown;
};

const is_equal = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return false;
};

const default_transform = (v: unknown): unknown => (typeof v === 'string' ? v.trim() : v);

export const diff_changed = <T extends Record<string, FieldSpec<any>>>(spec: T): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(spec)) {
    const f = spec[key]!;
    if (is_equal(f.next, f.original)) continue;
    const xform = f.transform ?? default_transform;
    out[f.out_key ?? key] = xform(f.next);
  }
  return out;
};

export const has_changes = (diff: Record<string, unknown>): boolean => Object.keys(diff).length > 0;
