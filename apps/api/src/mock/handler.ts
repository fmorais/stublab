import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import { endpoints, matchingRules } from '../db/schema.js'
import { WorkspaceService } from '../services/workspace-service.js'
import { matchEndpoint } from './engine.js'
import { ProxyService, ProxyServiceError } from '../services/proxy-service.js'
import { RecordingService, filterResponseHeaders } from '../services/recording-service.js'
import { isProxyGloballyEnabled, getProxyTimeoutMs } from '../config/env.js'
import type { Endpoint, HttpMethod, MatchingRule, RuleSource, RuleOperator } from '../types/endpoint.js'
import { Readable } from 'stream'

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

async function forwardToProxy(
  request: FastifyRequest,
  reply: FastifyReply,
  wildcardPath: string,
  proxyUrl: string,
  workspace: { id: string; recordEnabled: boolean },
): Promise<void> {
  try {
    const queryString = new URL(
      request.url,
      `${request.protocol}://${request.hostname}`,
    ).search
    let proxyBody: Readable | null = null
    let requestBodyStr: string | null = null
    if (request.body != null) {
      requestBodyStr = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
      proxyBody = Readable.from([Buffer.from(requestBodyStr)])
    }
    const result = await ProxyService.forward({
      method: request.method,
      path: wildcardPath + queryString,
      headers: request.headers,
      body: proxyBody,
      targetBaseUrl: proxyUrl,
      clientIp: request.ip,
      originalHost: request.hostname,
      originalProto: request.protocol,
      timeoutMs: getProxyTimeoutMs(),
    })

    if (workspace.recordEnabled) {
      const chunks: Buffer[] = []
      for await (const chunk of result.body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string))
      }
      const bodyBuffer = Buffer.concat(chunks)
      const bodyString = bodyBuffer.toString('utf-8')

      reply.header('x-stublab-proxied', 'true')
      const safeHeaders = filterResponseHeaders(result.headers)
      for (const [key, value] of Object.entries(safeHeaders)) {
        reply.header(key, value)
      }

      RecordingService.record({
        workspaceId: workspace.id,
        method: request.method,
        path: wildcardPath + queryString,
        requestHeaders: request.headers as Record<string, string>,
        requestBody: requestBodyStr,
        responseStatus: result.status,
        responseBody: bodyString,
        responseHeaders: safeHeaders,
      }).catch((err: unknown) => request.log.error({ err }, 'Falha ao gravar interação'))

      reply.status(result.status).send(bodyBuffer)
    } else {
      reply.header('x-stublab-proxied', 'true')
      for (const [key, value] of Object.entries(result.headers)) {
        reply.header(key, value)
      }
      reply.status(result.status).send(result.body)
    }
  } catch (err) {
    reply.header('x-stublab-proxied', 'true')
    if (err instanceof ProxyServiceError) {
      if (err.code === 'PROXY_TIMEOUT') {
        reply.status(504).send({ error: 'Proxy timeout', code: 'PROXY_TIMEOUT', target: err.target })
        return
      }
      reply.status(502).send({ error: 'Proxy error', code: 'PROXY_ERROR', target: err.target, reason: err.reason })
      return
    }
    throw err
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
          if (isProxyGloballyEnabled() && workspace.proxyEnabled && workspace.proxyUrl) {
            return forwardToProxy(request, reply, wildcardPath, workspace.proxyUrl, workspace)
          }
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
          if (isProxyGloballyEnabled() && workspace.proxyEnabled && workspace.proxyUrl) {
            return forwardToProxy(request, reply, wildcardPath, workspace.proxyUrl, workspace)
          }
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
