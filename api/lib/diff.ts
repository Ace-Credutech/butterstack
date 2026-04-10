// Token diffing — compare old vs new UITokens.
// Returns only what changed so the frontend can re-render minimally.

import type { UITokens } from './openai.ts'

export type TokenDiff = {
  changed: Partial<UITokens>
  added:   Partial<UITokens>
  removed: Partial<UITokens>
  hasChanges: boolean
}

export function diffTokens(prev: UITokens, next: UITokens): TokenDiff {
  const changed: Partial<UITokens> = {}
  const added:   Partial<UITokens> = {}
  const removed: Partial<UITokens> = {}

  for (const key of Object.keys(next) as (keyof UITokens)[]) {
    const prevVal = JSON.stringify(prev[key])
    const nextVal = JSON.stringify(next[key])

    if (prevVal === nextVal) continue

    if (prev[key] === undefined)              added[key]   = next[key] as never
    else if (next[key] === undefined)         removed[key] = prev[key] as never
    else                                      changed[key] = next[key] as never
  }

  return {
    changed,
    added,
    removed,
    hasChanges: Object.keys(changed).length > 0 || Object.keys(added).length > 0 || Object.keys(removed).length > 0,
  }
}
