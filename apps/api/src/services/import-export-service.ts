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
    // Por que: pré-carregar todos os endpoints existentes evita N+1 queries no loop.
    // Agrupa por method:path mantendo o mais recente (createdAt DESC) como representante
    // — mesmo critério usado em executeImport para overwrite determinístico.
    const allExisting = await db
      .select({ id: endpoints.id, method: endpoints.method, path: endpoints.path, createdAt: endpoints.createdAt })
      .from(endpoints)

    const existingMap = new Map<string, string>() // key → existingId (mais recente)
    for (const row of allExisting) {
      const key = `${row.method}:${row.path}`
      const current = existingMap.get(key)
      if (!current) {
        existingMap.set(key, row.id)
      }
      // Mantém o mais recente por createdAt
      const currentRow = allExisting.find((r) => r.id === current)
      if (currentRow && row.createdAt > currentRow.createdAt) {
        existingMap.set(key, row.id)
      }
    }

    const preview: ImportPreviewItem[] = []

    for (let i = 0; i < data.endpoints.length; i++) {
      const raw = data.endpoints[i]
      const parsed = exportedEndpointSchema.safeParse(raw)

      if (!parsed.success) {
        const r = raw as Record<string, unknown>
        preview.push({
          index: i,
          name: typeof r.name === 'string' ? r.name : '',
          method: typeof r.method === 'string' ? r.method : '',
          path: typeof r.path === 'string' ? r.path : '',
          status: 'invalid',
          rulesCount: 0,
          errors: parsed.error.issues.map((issue) => issue.message),
        })
        continue
      }

      const ep = parsed.data
      const key = `${ep.method}:${ep.path}`
      const existingId = existingMap.get(key)

      if (existingId) {
        preview.push({
          index: i,
          name: ep.name,
          method: ep.method,
          path: ep.path,
          status: 'conflict',
          existingId,
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
    // Por que: pré-carrega todos os endpoints existentes para evitar queries dentro da transação.
    // Agrupa por method:path, mantendo o mais recente (createdAt DESC) para overwrite determinístico.
    // Múltiplos endpoints com mesmo method+path são válidos (spec-002), mas para import
    // "overwrite" precisamos de um alvo único — escolhemos o mais recente.
    const allExisting = await db
      .select({ id: endpoints.id, method: endpoints.method, path: endpoints.path, createdAt: endpoints.createdAt })
      .from(endpoints)

    const existingMap = new Map<string, string>() // key → id do mais recente
    for (const row of allExisting) {
      const key = `${row.method}:${row.path}`
      const currentId = existingMap.get(key)
      if (!currentId) {
        existingMap.set(key, row.id)
        continue
      }
      const currentRow = allExisting.find((r) => r.id === currentId)
      if (currentRow && row.createdAt > currentRow.createdAt) {
        existingMap.set(key, row.id)
      }
    }

    // Por que: better-sqlite3 é síncrono. db.transaction() executa e faz rollback automático
    // se qualquer erro for lançado. Não há try/catch por item — qualquer falha aborta tudo.
    const txResult = db.transaction((tx) => {
      let created = 0
      let updated = 0
      let skipped = 0
      const now = new Date().toISOString()

      for (const ep of data.endpoints) {
        const key = `${ep.method}:${ep.path}`
        const existingId = existingMap.get(key)

        if (strategy === 'skip') {
          if (existingId) {
            skipped++
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
            // Por que: a coluna responseHeaders tem mode:'json' no schema Drizzle,
            // então o driver serializa/deserializa automaticamente. Passar o objeto
            // diretamente evita double-serialization (string JSON dentro de JSON).
            responseHeaders: ep.responseHeaders as unknown as string,
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
          created++
        } else if (strategy === 'overwrite') {
          if (existingId) {
            tx.update(endpoints).set({
              name: ep.name,
              active: ep.active,
              responseStatus: ep.responseStatus,
              responseBody: ep.responseBody,
              responseHeaders: ep.responseHeaders as unknown as string,
              delay: ep.delay,
              updatedAt: now,
            }).where(eq(endpoints.id, existingId)).run()
            tx.delete(matchingRulesTable).where(eq(matchingRulesTable.endpointId, existingId)).run()
            for (const rule of ep.matchingRules) {
              tx.insert(matchingRulesTable).values({
                id: uuidv4(),
                endpointId: existingId,
                source: rule.source,
                field: rule.field,
                operator: rule.operator,
                value: rule.value ?? null,
                createdAt: now,
              }).run()
            }
            updated++
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
              responseHeaders: ep.responseHeaders as unknown as string,
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
            created++
          }
        } else {
          // duplicate — sempre cria novo, independente de conflito
          const id = uuidv4()
          tx.insert(endpoints).values({
            id,
            name: ep.name,
            method: ep.method,
            path: ep.path,
            active: ep.active,
            responseStatus: ep.responseStatus,
            responseBody: ep.responseBody,
            responseHeaders: ep.responseHeaders as unknown as string,
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
          created++
        }
      }

      return { created, updated, skipped, errors: [] }
    })

    return txResult
  },
}
