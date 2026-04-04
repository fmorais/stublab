import { FastifyInstance } from 'fastify'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import { endpoints, matchingRules } from '../db/schema.js'
import { WorkspaceService } from '../services/workspace-service.js'
import { matchEndpoint } from './engine.js'
import type { Endpoint, HttpMethod, MatchingRule, RuleSource, RuleOperator } from '../types/endpoint.js'

function rowToEndpoint(
  row: typeof endpoints.$inferSelect,
  rules: MatchingRule[],
): Endpoint {
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
    matchingRules: rules,
  }
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export async function mockHandler(app: FastifyInstance): Promise<void> {
  for (const method of METHODS) {
    app.route({
      method,
      url: '/mock/:slug/*',
      handler: async (request, reply) => {
        const params = request.params as { slug: string; '*': string }
        const { slug } = params
        const wildcardPath = '/' + params['*']

        // 1. Buscar workspace pelo slug
        const workspace = await WorkspaceService.findBySlug(slug)
        if (!workspace) {
          return reply.status(404).send({
            error: 'Workspace não encontrado',
            code: 'WORKSPACE_NOT_FOUND',
          })
        }

        // Extrair query params
        const url = new URL(request.url, 'http://localhost')
        const queryParams: Record<string, string> = {}
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value
        })

        // Normalizar headers para lowercase
        const headers: Record<string, string> = {}
        Object.entries(request.headers).forEach(([key, value]) => {
          if (typeof value === 'string') headers[key.toLowerCase()] = value
        })

        // Parsear body como JSON se Content-Type for application/json
        let body: Record<string, unknown> | null = null
        const contentType = request.headers['content-type'] ?? ''
        if (contentType.includes('application/json') && request.body) {
          try {
            body =
              typeof request.body === 'string'
                ? (JSON.parse(request.body) as Record<string, unknown>)
                : (request.body as Record<string, unknown>)
          } catch {
            body = null
          }
        }

        // 2. Buscar apenas endpoints ativos do workspace
        const rows = await db
          .select()
          .from(endpoints)
          .where(and(
            eq(endpoints.workspaceId, workspace.id),
            eq(endpoints.active, true),
          ))

        if (rows.length === 0) {
          return reply
            .status(404)
            .send({ error: 'No mock found', code: 'MOCK_NOT_FOUND' })
        }

        // Buscar matching rules em batch para todos os endpoints ativos do workspace
        const endpointIds = rows.map((r) => r.id)
        const ruleRows = await db
          .select()
          .from(matchingRules)
          .where(inArray(matchingRules.endpointId, endpointIds))

        // Agrupar regras por endpointId
        const rulesByEndpointId = new Map<string, MatchingRule[]>()
        for (const ruleRow of ruleRows) {
          const list = rulesByEndpointId.get(ruleRow.endpointId) ?? []
          list.push({
            id: ruleRow.id,
            endpointId: ruleRow.endpointId,
            source: ruleRow.source as RuleSource,
            field: ruleRow.field,
            operator: ruleRow.operator as RuleOperator,
            value: ruleRow.value ?? null,
            createdAt: ruleRow.createdAt,
          })
          rulesByEndpointId.set(ruleRow.endpointId, list)
        }

        const activeEndpoints = rows.map((row) =>
          rowToEndpoint(row, rulesByEndpointId.get(row.id) ?? []),
        )

        const matched = matchEndpoint(method, wildcardPath, queryParams, headers, body, activeEndpoints)

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
