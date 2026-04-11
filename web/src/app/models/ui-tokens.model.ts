export type PageType = 'dashboard' | 'form' | 'list' | 'login' | 'detail' | 'landing' | 'settings' | 'empty'
export type Layout   = 'sidebar-main' | 'centered' | 'full-page'

export interface UIField  { name: string; type: string }
export interface UIStat   { label: string; value: string }

export interface UITokens {
  page_type:  PageType
  layout:     Layout
  intent:     string
  navigation: string[]
  sections:   string[]
  actions:    string[]
  fields:     UIField[]
  stats:      UIStat[]
  entity:     string
  search:     boolean
  filters:    boolean
}

export interface GenerateResponse {
  tokens:      UITokens
  cleanPrompt: string
  source:      'cache' | 'fuzzy' | 'batch' | 'openai'
  cached:      boolean
}

export interface RegenerateResponse extends GenerateResponse {
  diff:     Record<string, unknown> | null
  version:  string
  feedback: string | null
}

export interface VersionEntry {
  id:          number
  label:       string
  time:        string
  tokens:      UITokens
  cleanPrompt: string
  source:      string
  approved?:   boolean
  approvedAt?: string
}
