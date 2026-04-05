import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { eq, and, inArray, like, count, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { recordedInteractions } from '../db/schema.js'
import type { RecordedInteraction, RecordInteractionInput } from '../types/recording.js'

const MAX_BODY_SIZE = 1024 * 1024 // 1MB

const FILTERED_RESPONSE_HEADERS = new Set([
  'transfer-encoding', 'connection', 'keep-alive',
  'content-length', 'content-encoding',
])

const FILTERED_REQUEST_HEADERS = new Set(['host', 'connection'])

export function computeGroupKey(
  method: string,
  path: string,
  responseStatus: number,
  responseBody: string | null,
): string {
  const hash = createHash('sha256')
  hash.update(method.toUpperCase())
  hash.update('\0')
  hash.update(path)
  hash.update('\0')
  hash.update(String(responseStatus))
  hash.update('\0')
  hash.update(responseBody ?? '')
  return hash.digest('hex')
}

export function filterRequestHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase()
    if (FILTERED_REQUEST_HEADERS.has(lower)) continue
    if (lower.startsWith('x-stublab-')) continue
    if (lower.startsWith('x-forwarded-')) continue
    if (value === undefined) continue
    result[lower] = Array.isArray(value) ? value.join(', ') : value
  }
  return result
}

export function filterResponseHeaders(
  headers: Record<string, string | string[]>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase()
    if (FILTERED_RESPONSE_HEADERS.has(lower)) continue
    if (lower.startsWith('x-stublab-')) continue
    if (lower.startsWith('x-forwarded-')) continue
    result[lower] = Array.isArray(value) ? value.join(', ') : value
  }
  return result
}

export function truncateBody(body: string | null): string | null {
  if (!body) return body
  if (body.length <= MAX_BODY_SIZE) return body
  return body.slice(0, MAX_BODY_SIZE) + '\n[truncated]'
}

function rowToRecording(row: typeof recordedInteractions.$inferSelect): RecordedInteraction {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    method: row.method,
    path: row.path,
    requestHeaders: (row.requestHeaders ?? {}) as Record<string, string>,
    requestBody: row.requestBody ?? null,
    responseStatus: row.responseStatus,
    responseBody: row.responseBody ?? null,
    responseHeaders: (row.responseHeaders ?? {}) as Record<string, string>,
    capturedAt: row.capturedAt,
    groupKey: row.groupKey,
    groupCount: row.groupCount,
  }
}

export const RecordingService = {
  async record(input: RecordInteractionInput): Promise<void> {
    const groupKey = computeGroupKey(input.method, input.path, input.responseStatus, input.responseBody)
    const now = new Date().toISOString()
    const id = uuidv4()

    const filteredRequestHeaders = filterRequestHeaders(input.requestHeaders as Record<string, string>)
    const filteredResponseHeaders = filterResponseHeaders(input.responseHeaders as Record<string, string>)
    const truncatedRequestBody = truncateBody(input.requestBody)
    const truncatedResponseBody = truncateBody(input.responseBody)

    await db.insert(recordedInteractions).values({
      id,
      workspaceId: input.workspaceId,
      method: input.method.toUpperCase(),
      path: input.path,
      requestHeaders: filteredRequestHeaders,
      requestBody: truncatedRequestBody,
      responseStatus: input.responseStatus,
      responseBody: truncatedResponseBody,
      responseHeaders: filteredResponseHeaders,
      capturedAt: now,
      groupKey,
      groupCount: 1,
    }).onConflictDoUpdate({
      target: [recordedInteractions.workspaceId, recordedInteractions.groupKey],
      set: {
        groupCount: sql`${recordedInteractions.groupCount} + 1`,
        capturedAt: now,
        requestHeaders: sql`excluded.request_headers`,
        requestBody: sql`excluded.request_body`,
      },
    })
  },

  async findByWorkspace(
    workspaceId: string,
    filters?: { method?: string; status?: number; search?: string },
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: RecordedInteraction[]; total: number; limit: number; offset: number }> {
    const limit = Math.min(pagination?.limit ?? 50, 100)
    const offset = pagination?.offset ?? 0

    const conditions = [eq(recordedInteractions.workspaceId, workspaceId)]
    if (filters?.method) conditions.push(eq(recordedInteractions.method, filters.method.toUpperCase()))
    if (filters?.status) conditions.push(eq(recordedInteractions.responseStatus, filters.status))
    if (filters?.search) conditions.push(like(recordedInteractions.path, `%${filters.search}%`))

    const where = and(...conditions)

    const [rows, totalRows] = await Promise.all([
      db.select().from(recordedInteractions).where(where)
        .orderBy(sql`${recordedInteractions.capturedAt} DESC`)
        .limit(limit).offset(offset),
      db.select({ count: count() }).from(recordedInteractions).where(where),
    ])

    return {
      data: rows.map(rowToRecording),
      total: totalRows[0]?.count ?? 0,
      limit,
      offset,
    }
  },

  async findById(id: string, workspaceId: string): Promise<RecordedInteraction | null> {
    const rows = await db.select().from(recordedInteractions)
      .where(and(eq(recordedInteractions.id, id), eq(recordedInteractions.workspaceId, workspaceId)))
    return rows[0] ? rowToRecording(rows[0]) : null
  },

  async delete(id: string, workspaceId: string): Promise<boolean> {
    const result = await db.delete(recordedInteractions)
      .where(and(eq(recordedInteractions.id, id), eq(recordedInteractions.workspaceId, workspaceId)))
    return (result.changes ?? 0) > 0
  },

  async deleteMany(ids: string[], workspaceId: string): Promise<number> {
    if (ids.length === 0) return 0
    const result = await db.delete(recordedInteractions)
      .where(and(inArray(recordedInteractions.id, ids), eq(recordedInteractions.workspaceId, workspaceId)))
    return result.changes ?? 0
  },

  async deleteAll(workspaceId: string): Promise<number> {
    const result = await db.delete(recordedInteractions)
      .where(eq(recordedInteractions.workspaceId, workspaceId))
    return result.changes ?? 0
  },
}
