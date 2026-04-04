import { eq, and, or, like, ne } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { endpoints } from '../db/schema.js'
import type { Endpoint, CreateEndpointInput, UpdateEndpointInput, HttpMethod } from '../types/endpoint.js'
import { MatchingRuleService } from './matching-rule-service.js'

export class EndpointServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'CONFLICT',
    message: string,
  ) {
    super(message)
    this.name = 'EndpointServiceError'
  }
}

function rowToEndpoint(row: typeof endpoints.$inferSelect): Endpoint {
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

export const EndpointService = {
  async create(input: CreateEndpointInput): Promise<Endpoint> {
    // Por que: só é conflito quando o novo endpoint NÃO tem regras (seria um segundo fallback).
    // Endpoints com regras podem coexistir no mesmo method+path — é o caso de uso central da spec-002.
    // A unicidade é por workspace: endpoints de workspaces diferentes não conflitam.
    const incomingHasRules = (input.matchingRules?.length ?? 0) > 0

    if (!incomingHasRules) {
      const existingFallbacks = await db
        .select({ id: endpoints.id })
        .from(endpoints)
        .where(
          and(
            eq(endpoints.workspaceId, input.workspaceId),
            eq(endpoints.method, input.method),
            eq(endpoints.path, input.path),
            eq(endpoints.active, true),
          ),
        )

      const fallbackIds = existingFallbacks.map((e) => e.id)
      if (fallbackIds.length > 0) {
        const existingRules = await MatchingRuleService.findByEndpointIds(fallbackIds)
        const hasFallback = fallbackIds.some((id) => (existingRules.get(id) ?? []).length === 0)

        if (hasFallback) {
          throw new EndpointServiceError(
            'CONFLICT',
            `Já existe um endpoint ativo sem regras com o método ${input.method} e path ${input.path}`,
          )
        }
      }
    }

    const now = new Date().toISOString()
    const id = uuidv4()

    const newEndpoint = {
      id,
      workspaceId: input.workspaceId,
      name: input.name,
      method: input.method,
      path: input.path,
      active: true,
      responseStatus: input.responseStatus,
      responseBody: input.responseBody ?? '{}',
      responseHeaders: (input.responseHeaders ?? {}) as Record<string, string>,
      delay: input.delay ?? 0,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(endpoints).values(newEndpoint)

    const [created] = await db.select().from(endpoints).where(eq(endpoints.id, id))

    const rules = input.matchingRules?.length
      ? await MatchingRuleService.createMany(id, input.matchingRules)
      : []

    return { ...rowToEndpoint(created), matchingRules: rules }
  },

  async findAll(
    workspaceId: string,
    filters?: { search?: string; method?: HttpMethod; active?: boolean },
  ): Promise<{ data: Endpoint[]; total: number }> {
    const conditions = [eq(endpoints.workspaceId, workspaceId)]

    if (filters?.search) {
      const term = `%${filters.search}%`
      conditions.push(or(like(endpoints.name, term), like(endpoints.path, term))!)
    }

    if (filters?.method !== undefined) {
      conditions.push(eq(endpoints.method, filters.method))
    }

    if (filters?.active !== undefined) {
      conditions.push(eq(endpoints.active, filters.active))
    }

    const rows = await db.select().from(endpoints).where(and(...conditions))

    const baseEndpoints = rows.map(rowToEndpoint)
    const ids = baseEndpoints.map((e) => e.id)
    const rulesMap = await MatchingRuleService.findByEndpointIds(ids)
    const data = baseEndpoints.map((e) => ({
      ...e,
      matchingRules: rulesMap.get(e.id) ?? [],
    }))
    return { data, total: data.length }
  },

  async findById(id: string, workspaceId: string): Promise<Endpoint | null> {
    const [row] = await db.select().from(endpoints).where(eq(endpoints.id, id))
    if (!row) return null
    // Por que: retorna null se o endpoint pertence a outro workspace — equivalente a "não existe" neste contexto
    if (row.workspaceId !== workspaceId) return null
    const rules = await MatchingRuleService.findByEndpointId(id)
    return { ...rowToEndpoint(row), matchingRules: rules }
  },

  async update(id: string, workspaceId: string, input: UpdateEndpointInput): Promise<Endpoint> {
    const [existing] = await db.select().from(endpoints).where(eq(endpoints.id, id))

    if (!existing) {
      throw new EndpointServiceError('NOT_FOUND', `Endpoint com id ${id} não encontrado`)
    }

    if (existing.workspaceId !== workspaceId) {
      throw new EndpointServiceError('NOT_FOUND', `Endpoint com id ${id} não encontrado`)
    }

    const newMethod = input.method ?? existing.method
    const newPath = input.path ?? existing.path

    const isMethodOrPathChanging =
      (input.method !== undefined && input.method !== existing.method) ||
      (input.path !== undefined && input.path !== existing.path)

    if (isMethodOrPathChanging && existing.active) {
      const updatedRules = input.matchingRules !== undefined
        ? input.matchingRules
        : await MatchingRuleService.findByEndpointId(id)
      const updatedHasRules = updatedRules.length > 0

      if (!updatedHasRules) {
        const candidates = await db
          .select({ id: endpoints.id })
          .from(endpoints)
          .where(
            and(
              eq(endpoints.workspaceId, workspaceId),
              eq(endpoints.method, newMethod),
              eq(endpoints.path, newPath),
              eq(endpoints.active, true),
              ne(endpoints.id, id),
            ),
          )

        if (candidates.length > 0) {
          const rulesMap = await MatchingRuleService.findByEndpointIds(candidates.map((c) => c.id))
          const hasFallback = candidates.some((c) => (rulesMap.get(c.id) ?? []).length === 0)

          if (hasFallback) {
            throw new EndpointServiceError(
              'CONFLICT',
              `Já existe um endpoint ativo sem regras com o método ${newMethod} e path ${newPath}`,
            )
          }
        }
      }
    }

    const now = new Date().toISOString()

    await db
      .update(endpoints)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.method !== undefined && { method: input.method }),
        ...(input.path !== undefined && { path: input.path }),
        ...(input.responseStatus !== undefined && { responseStatus: input.responseStatus }),
        ...(input.responseBody !== undefined && { responseBody: input.responseBody }),
        ...(input.responseHeaders !== undefined && {
          responseHeaders: input.responseHeaders as Record<string, string>,
        }),
        ...(input.delay !== undefined && { delay: input.delay }),
        updatedAt: now,
      })
      .where(eq(endpoints.id, id))

    const [updated] = await db.select().from(endpoints).where(eq(endpoints.id, id))

    let rules
    if (input.matchingRules !== undefined) {
      await MatchingRuleService.deleteByEndpointId(id)
      rules = await MatchingRuleService.createMany(id, input.matchingRules)
    } else {
      rules = await MatchingRuleService.findByEndpointId(id)
    }

    return { ...rowToEndpoint(updated), matchingRules: rules }
  },

  async toggle(id: string, workspaceId: string): Promise<Pick<Endpoint, 'id' | 'active' | 'updatedAt'>> {
    const [existing] = await db.select().from(endpoints).where(eq(endpoints.id, id))

    if (!existing) {
      throw new EndpointServiceError('NOT_FOUND', `Endpoint com id ${id} não encontrado`)
    }

    if (existing.workspaceId !== workspaceId) {
      throw new EndpointServiceError('NOT_FOUND', `Endpoint com id ${id} não encontrado`)
    }

    const newActive = !existing.active

    if (newActive) {
      const currentRules = await MatchingRuleService.findByEndpointId(id)
      const hasRules = currentRules.length > 0

      if (!hasRules) {
        const candidates = await db
          .select({ id: endpoints.id })
          .from(endpoints)
          .where(
            and(
              eq(endpoints.workspaceId, workspaceId),
              eq(endpoints.method, existing.method),
              eq(endpoints.path, existing.path),
              eq(endpoints.active, true),
              ne(endpoints.id, id),
            ),
          )

        if (candidates.length > 0) {
          const rulesMap = await MatchingRuleService.findByEndpointIds(candidates.map((c) => c.id))
          const hasFallback = candidates.some((c) => (rulesMap.get(c.id) ?? []).length === 0)

          if (hasFallback) {
            throw new EndpointServiceError(
              'CONFLICT',
              `Já existe um endpoint ativo sem regras com o método ${existing.method} e path ${existing.path}`,
            )
          }
        }
      }
    }

    const now = new Date().toISOString()
    await db.update(endpoints).set({ active: newActive, updatedAt: now }).where(eq(endpoints.id, id))

    return { id, active: newActive, updatedAt: now }
  },

  async delete(id: string, workspaceId: string): Promise<boolean> {
    const [existing] = await db.select().from(endpoints).where(eq(endpoints.id, id))

    if (!existing) return false
    if (existing.workspaceId !== workspaceId) return false

    await db.delete(endpoints).where(eq(endpoints.id, id))
    return true
  },
}
