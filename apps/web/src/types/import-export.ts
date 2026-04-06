export interface ExportedMatchingRule {
  source: 'query' | 'header' | 'body'
  field: string
  operator: 'eq' | 'neq' | 'contains' | 'exists' | 'not_exists'
  value?: string | null
}

export interface ExportedEndpoint {
  name: string
  method: string
  path: string
  active: boolean
  responseStatus: number
  responseBody: string
  responseHeaders: Record<string, string>
  delay: number
  matchingRules: ExportedMatchingRule[]
}

export interface ExportFile {
  version: string
  exportedAt: string
  exportedBy: string
  count: number
  endpoints: ExportedEndpoint[]
  workspace?: { name: string; slug: string }
}

export interface ImportPreviewItem {
  index: number
  name: string
  method: string
  path: string
  status: 'new' | 'conflict' | 'invalid'
  existingId?: string
  rulesCount: number
  errors: string[]
}

export interface ImportPreviewResult {
  valid: boolean
  version: string
  totalInFile: number
  preview: ImportPreviewItem[]
  summary: { new: number; conflict: number; invalid: number }
  endpoints?: ExportedEndpoint[]
}

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: Array<{ index: number; message: string }>
}

export type ImportStrategy = 'skip' | 'overwrite' | 'duplicate'
