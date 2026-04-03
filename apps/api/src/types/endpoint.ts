export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface Endpoint {
  id: string
  name: string
  method: HttpMethod
  path: string
  active: boolean
  responseStatus: number
  responseBody: string
  responseHeaders: Record<string, string>
  delay: number
  createdAt: string
  updatedAt: string
}

export interface CreateEndpointInput {
  name: string
  method: HttpMethod
  path: string
  responseStatus: number
  responseBody?: string
  responseHeaders?: Record<string, string>
  delay?: number
}

export interface UpdateEndpointInput {
  name?: string
  method?: HttpMethod
  path?: string
  responseStatus?: number
  responseBody?: string
  responseHeaders?: Record<string, string>
  delay?: number
}
