import { eq, and, inArray } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { endpoints, matchingRules as matchingRulesTable } from '../db/schema.js'
import { MatchingRuleService } from './matching-rule-service.js'
import { exportedEndpointSchema } from '../schemas/import-export.js'
import type { ExportFile, ExportedEndpoint, ImportStrategy, LooseExportFile } from '../schemas/import-export.js'

export class ImportExportServiceError extends Error {
  constructor(public code: 'NOT_FOUND', message: string) {
    super(message)
    this.name = 'ImportExportServiceError'
  }
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
}

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: Array<{ index: number; message: string }>
}

export const ImportExportService = {
  async exportEndpoints(ids?: string[]): Promise<ExportFile> {
    let rows: (typeof endpoints.$inferSelect)[]

    if (ids !== undefined && ids.length > 0) {
      rows = await db.select().from(endpoints).where(inArray(endpoints.id, ids))

      const foundIds = new Set(rows.map((r) => r.id))
      const missingId = ids.find((id) => !foundIds.has(id))
      if (missingId) {
        throw new ImportExportServiceError('NOT_FOUND', `Endpoint com id ${missingId} não encontrado`)
      }
    } else if (ids !== undefined && ids.length === 0) {
      rows = []
    } else {
      rows = await db.select().from(endpoints)
    }

    const allIds = rows.map((r) => r.id)
    const rulesMap = await MatchingRuleService.findByEndpointIds(allIds)

    const exportedEndpoints: ExportedEndpoint[] = rows.map((row) => {
      const rules = rulesMap.get(row.id) ?? []
      return {
        name: row.name,
        method: row.method as ExportedEndpoint['method'],
        path: row.path,
        active: row.active,
        responseStatus: row.responseStatus,
        responseBody: row.responseBody,
        responseHeaders: (row.responseHeaders ?? {}) as Record<string, string>,
        delay: row.delay,
        matchingRules: rules.map((r) => ({
          source: r.source,
          field: r.field,
          operator: r.operator,
          value: r.value ?? null,
        })),
      }
    })

    return {
      version: '1',
      exportedAt: new Date().toISOString(),
      exportedBy: 'StubLab',
      count: exportedEndpoints.length,
      endpoints: exportedEndpoints,
    }
  },

  async previewImport(data: LooseExportFile): Promise<ImportPreviewResult> {
    const preview: ImportPreviewItem[] = []

    for (let i = 0; i < data.endpoints.length; i++) {
      const raw = data.endpoints[i]
      const parsed = exportedEndpointSchema.safeParse(raw)

      if (!parsed.success) {
        preview.push({
          index: i,
          name: typeof raw.name === 'string' ? raw.name : '',
          method: typeof raw.method === 'string' ? raw.method : '',
          path: typeof raw.path === 'string' ? raw.path : '',
          status: 'invalid',
          rulesCount: 0,
          errors: parsed.error.issues.map((issue) => issue.message),
        })
        continue
      }

      const ep = parsed.data

      const existing = await db
        .select({ id: endpoints.id })
        .from(endpoints)
        .where(and(eq(endpoints.method, ep.method), eq(endpoints.path, ep.path)))

      if (existing.length > 0) {
        preview.push({
          index: i,
          name: ep.name,
          method: ep.method,
          path: ep.path,
          status: 'conflict',
          existingId: existing[0].id,
          rulesCount: ep.matchingRules.length,
          errors: [],
        })
      } else {
        preview.push({
          index: i,
          name: ep.name,
          method: ep.method,
          path: ep.path,
          status: 'new',
          rulesCount: ep.matchingRules.length,
          errors: [],
        })
      }
    }

    const summary = {
      new: preview.filter((p) => p.status === 'new').length,
      conflict: preview.filter((p) => p.status === 'conflict').length,
      invalid: preview.filter((p) => p.status === 'invalid').length,
    }

    return {
      valid: summary.invalid === 0,
      version: data.version,
      totalInFile: data.endpoints.length,
      preview,
      summary,
    }
  },

  async executeImport(data: ExportFile, strategy: ImportStrategy): Promise<ImportResult> {
    // Pre-fetch all existing endpoints for conflict detection
    const allExisting = await db.select().from(endpoints)

    const existingMap = new Map<string, typeof endpoints.$inferSelect>()
    for (const row of allExisting) {
      existingMap.set(`${row.method}:${row.path}`, row)
    }

    // Por que: better-sqlite3 é síncrono. db.transaction() executa e retorna o resultado diretamente.
    const txResult = db.transaction((tx) => {
      const accumulator: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] }
      const now = new Date().toISOString()

      for (let i = 0; i < data.endpoints.length; i++) {
        const ep = data.endpoints[i]
        const key = `${ep.method}:${ep.path}`
        const existing = existingMap.get(key)

        try {
          if (strategy === 'skip') {
            if (existing) {
              accumulator.skipped++
              continue
            }
            const id = uuidv4()
            tx.insert(endpoints).values({
              id,
              name: ep.name,
              method: ep.method,
              path: ep.path,
              active: ep.active,
              responseStatus: ep.responseStatus,
              responseBody: ep.responseBody,
              responseHeaders: JSON.stringify(ep.responseHeaders),
              delay: ep.delay,
              createdAt: now,
              updatedAt: now,
            }).run()
            for (const rule of ep.matchingRules) {
              tx.insert(matchingRulesTable).values({
                id: uuidv4(),
                endpointId: id,
                source: rule.source,
                field: rule.field,
                operator: rule.operator,
                value: rule.value ?? null,
                createdAt: now,
              }).run()
            }
            accumulator.created++
          } else if (strategy === 'overwrite') {
            if (existing) {
              tx.update(endpoints).set({
                name: ep.name,
                active: ep.active,
                responseStatus: ep.responseStatus,
                responseBody: ep.responseBody,
                responseHeaders: JSON.stringify(ep.responseHeaders),
                delay: ep.delay,
                updatedAt: now,
              }).where(eq(endpoints.id, existing.id)).run()
              tx.delete(matchingRulesTable).where(eq(matchingRulesTable.endpointId, existing.id)).run()
              for (const rule of ep.matchingRules) {
                tx.insert(matchingRulesTable).values({
                  id: uuidv4(),
                  endpointId: existing.id,
                  source: rule.source,
                  field: rule.field,
                  operator: rule.operator,
                  value: rule.value ?? null,
                  createdAt: now,
                }).run()
              }
              accumulator.updated++
            } else {
              const id = uuidv4()
              tx.insert(endpoints).values({
                id,
                name: ep.name,
                method: ep.method,
                path: ep.path,
                active: ep.active,
                responseStatus: ep.responseStatus,
                responseBody: ep.responseBody,
                responseHeaders: JSON.stringify(ep.responseHeaders),
                delay: ep.delay,
                createdAt: now,
                updatedAt: now,
              }).run()
              for (const rule of ep.matchingRules) {
                tx.insert(matchingRulesTable).values({
                  id: uuidv4(),
                  endpointId: id,
                  source: rule.source,
                  field: rule.field,
                  operator: rule.operator,
                  value: rule.value ?? null,
                  createdAt: now,
                }).run()
              }
              accumulator.created++
            }
          } else {
            // duplicate
            const id = uuidv4()
            tx.insert(endpoints).values({
              id,
              name: ep.name,
              method: ep.method,
              path: ep.path,
              active: ep.active,
              responseStatus: ep.responseStatus,
              responseBody: ep.responseBody,
              responseHeaders: JSON.stringify(ep.responseHeaders),
              delay: ep.delay,
              createdAt: now,
              updatedAt: now,
            }).run()
            for (const rule of ep.matchingRules) {
              tx.insert(matchingRulesTable).values({
                id: uuidv4(),
                endpointId: id,
                source: rule.source,
                field: rule.field,
                operator: rule.operator,
                value: rule.value ?? null,
                createdAt: now,
              }).run()
            }
            accumulator.created++
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro desconhecido'
          accumulator.errors.push({ index: i, message })
        }
      }

      return accumulator
    })

    return txResult
  },
}
