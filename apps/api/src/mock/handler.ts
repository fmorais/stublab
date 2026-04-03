import { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { endpoints } from '../db/schema.js'
import { matchEndpoint } from './engine.js'
import type { Endpoint, HttpMethod } from '../types/endpoint.js'

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

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export async function mockHandler(app: FastifyInstance): Promise<void> {
  for (const method of METHODS) {
    app.route({
      method,
      url: '/mock/*',
      handler: async (request, reply) => {
        const wildcardPath = '/' + (request.params as { '*': string })['*']

        const rows = await db
          .select()
          .from(endpoints)
          .where(eq(endpoints.active, true))

        const activeEndpoints = rows.map(rowToEndpoint)

        const matched = matchEndpoint(method, wildcardPath, activeEndpoints)

        if (!matched) {
          return reply
            .status(404)
            .send({ error: 'No mock found', code: 'MOCK_NOT_FOUND' })
        }

        if (matched.delay > 0) {
          await new Promise<void>((r) => setTimeout(r, matched.delay))
        }

        for (const [key, value] of Object.entries(matched.responseHeaders)) {
          reply.header(key, value)
        }

        return reply.status(matched.responseStatus).send(matched.responseBody)
      },
    })
  }
}
