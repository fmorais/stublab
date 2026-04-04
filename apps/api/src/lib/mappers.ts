import type { Endpoint, HttpMethod } from '../types/endpoint.js'
import type { endpoints } from '../db/schema.js'

export function rowToEndpoint(row: typeof endpoints.$inferSelect): Endpoint {
  return {
    id: row.id,
    name: row.name,
    method: row.method as HttpMethod,
    path: row.path,
    active: row.active,
    responseStatus: row.responseStatus,
    responseBody: row.responseBody,
    responseHeaders: (row.responseHeaders ?? {}) as Record<string, string>,
    delay: row.delay,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    matchingRules: [],
  }
}
