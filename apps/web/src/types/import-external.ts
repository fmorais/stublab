export type ImportSource = 'stublab' | 'postman' | 'openapi'

export interface FetchUrlResponse {
  source: 'openapi'
  data: unknown
  detectedVersion: string
}

export interface ParseError {
  message: string
  path?: string
}
