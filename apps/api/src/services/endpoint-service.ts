import { eq, and, or, like, ne, type SQL } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { endpoints } from '../db/schema.js'
import type { Endpoint, CreateEndpointInput, UpdateEndpointInput, HttpMethod } from '../types/endpoint.js'

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
  }
}

export const EndpointService = {
  async create(input: CreateEndpointInput): Promise<Endpoint> {
    const existing = await db
      .select()
      .from(endpoints)
      .where(
        and(
          eq(endpoints.method, input.method),
          eq(endpoints.path, input.path),
          eq(endpoints.active, true),
        ),
      )

    if (existing.length > 0) {
      throw new EndpointServiceError(
        'CONFLICT',
        `Já existe um endpoint ativo com o método ${input.method} e path ${input.path}`,
      )
    }

    const now = new Date().toISOString()
    const id = uuidv4()

    const newEndpoint = {
      id,
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

    try {
      await db.insert(endpoints).values(newEndpoint)
    } catch (err) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
        throw new EndpointServiceError(
          'CONFLICT',
          `Já existe um endpoint ativo com o método ${input.method} e path ${input.path}`,
        )
      }
      throw err
    }

    const [created] = await db.select().from(endpoints).where(eq(endpoints.id, id))

    return rowToEndpoint(created)
  },

  async findAll(
    filters?: { search?: string; method?: HttpMethod; active?: boolean },
  ): Promise<{ data: Endpoint[]; total: number }> {
    const conditions: (SQL<unknown> | undefined)[] = []

    if (filters?.search) {
      const term = `%${filters.search}%`
      conditions.push(or(like(endpoints.name, term), like(endpoints.path, term)))
    }

    if (filters?.method !== undefined) {
      conditions.push(eq(endpoints.method, filters.method))
    }

    if (filters?.active !== undefined) {
      conditions.push(eq(endpoints.active, filters.active))
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(endpoints)
            .where(and(...conditions))
        : await db.select().from(endpoints)

    const data = rows.map(rowToEndpoint)
    return { data, total: data.length }
  },

  async findById(id: string): Promise<Endpoint | null> {
    const [row] = await db.select().from(endpoints).where(eq(endpoints.id, id))
    return row ? rowToEndpoint(row) : null
  },

  async update(id: string, input: UpdateEndpointInput): Promise<Endpoint> {
    const [existing] = await db.select().from(endpoints).where(eq(endpoints.id, id))

    if (!existing) {
      throw new EndpointServiceError('NOT_FOUND', `Endpoint com id ${id} não encontrado`)
    }

    const newMethod = input.method ?? existing.method
    const newPath = input.path ?? existing.path

    const isMethodOrPathChanging =
      (input.method !== undefined && input.method !== existing.method) ||
      (input.path !== undefined && input.path !== existing.path)

    if (isMethodOrPathChanging && existing.active) {
      const conflict = await db
        .select()
        .from(endpoints)
        .where(
          and(
            eq(endpoints.method, newMethod),
            eq(endpoints.path, newPath),
            eq(endpoints.active, true),
            ne(endpoints.id, id),
          ),
        )

      if (conflict.length > 0) {
        throw new EndpointServiceError(
          'CONFLICT',
          `Já existe um endpoint ativo com o método ${newMethod} e path ${newPath}`,
        )
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
    return rowToEndpoint(updated)
  },

  async toggle(id: string): Promise<Pick<Endpoint, 'id' | 'active' | 'updatedAt'>> {
    const [existing] = await db.select().from(endpoints).where(eq(endpoints.id, id))

    if (!existing) {
      throw new EndpointServiceError('NOT_FOUND', `Endpoint com id ${id} não encontrado`)
    }

    const newActive = !existing.active

    if (newActive) {
      const conflict = await db
        .select()
        .from(endpoints)
        .where(
          and(
            eq(endpoints.method, existing.method),
            eq(endpoints.path, existing.path),
            eq(endpoints.active, true),
            ne(endpoints.id, id),
          ),
        )

      if (conflict.length > 0) {
        throw new EndpointServiceError(
          'CONFLICT',
          `Já existe um endpoint ativo com o método ${existing.method} e path ${existing.path}`,
        )
      }
    }

    const now = new Date().toISOString()

    try {
      await db.update(endpoints).set({ active: newActive, updatedAt: now }).where(eq(endpoints.id, id))
    } catch (err) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
        throw new EndpointServiceError(
          'CONFLICT',
          `Já existe um endpoint ativo com o método ${existing.method} e path ${existing.path}`,
        )
      }
      throw err
    }

    return { id, active: newActive, updatedAt: now }
  },

  async delete(id: string): Promise<boolean> {
    const [existing] = await db.select().from(endpoints).where(eq(endpoints.id, id))

    if (!existing) {
      return false
    }

    await db.delete(endpoints).where(eq(endpoints.id, id))
    return true
  },
}
