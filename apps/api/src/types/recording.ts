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

export interface RecordInteractionInput {
  workspaceId: string
  method: string
  path: string
  requestHeaders: Record<string, string>
  requestBody: string | null
  responseStatus: number
  responseBody: string | null
  responseHeaders: Record<string, string>
}
