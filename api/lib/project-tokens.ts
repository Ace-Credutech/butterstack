// Shared project-level tokens — nav, layout, brand inherited by every page in a project.
// Any page-level token generation merges project defaults before rendering.

import { query } from '../db.ts'

export type ProjectTokens = {
  navigation:  string[]
  brandColor:  string
  layout:      string
  entityMap:   Record<string, string>
}

const DEFAULT: ProjectTokens = {
  navigation: ['Dashboard', 'Projects', 'Requirements', 'Prototypes', 'Settings'],
  brandColor: 'green',
  layout:     'sidebar-main',
  entityMap:  {},
}

export async function getProjectTokens(projectId = 'default'): Promise<ProjectTokens> {
  const result = await query(
    `SELECT navigation, brand_color, layout, entity_map FROM project_tokens WHERE project_id = $1`,
    [projectId]
  )
  if (!result.rows.length) return DEFAULT

  const row = result.rows[0]
  return {
    navigation: row.navigation ?? DEFAULT.navigation,
    brandColor: row.brand_color ?? DEFAULT.brandColor,
    layout:     row.layout ?? DEFAULT.layout,
    entityMap:  row.entity_map ?? {},
  }
}

export async function upsertProjectTokens(projectId = 'default', tokens: Partial<ProjectTokens>): Promise<void> {
  await query(
    `INSERT INTO project_tokens (project_id, navigation, brand_color, layout, entity_map)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (project_id) DO UPDATE SET
       navigation  = COALESCE($2, project_tokens.navigation),
       brand_color = COALESCE($3, project_tokens.brand_color),
       layout      = COALESCE($4, project_tokens.layout),
       entity_map  = COALESCE($5, project_tokens.entity_map),
       updated_at  = NOW()`,
    [
      projectId,
      tokens.navigation ? JSON.stringify(tokens.navigation) : null,
      tokens.brandColor ?? null,
      tokens.layout ?? null,
      tokens.entityMap ? JSON.stringify(tokens.entityMap) : null,
    ]
  )
}

// Merge project defaults into page-level tokens before rendering
export function mergeWithProject<T extends { navigation?: string[]; layout?: string }>(
  pageTokens: T,
  project: ProjectTokens
): T {
  return {
    ...pageTokens,
    navigation: pageTokens.navigation?.length ? pageTokens.navigation : project.navigation,
    layout:     pageTokens.layout ?? project.layout,
  }
}
