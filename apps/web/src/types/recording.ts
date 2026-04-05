export interface RecordedInteraction {
  id: string
  workspaceId: string
  method: string
  path: string
  requestHeaders: Record<string, string>
  requestBody: string | null
  responseStatus: number
  responseBody: string | null
  responseHeaders: Record<string, string>
  capturedAt: string
  groupKey: string
  groupCount: number
}

export interface RecordingsListResponse {
  data: RecordedInteraction[]
  total: number
  limit: number
  offset: number
}

export interface SaveRecordingInput {
  name?: string
  delay?: number
  overwrite?: boolean
}

export interface SaveBulkResponse {
  created: number
  skipped: number
  deleted: number
  errors: string[]
}
