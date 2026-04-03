import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { EndpointService, EndpointServiceError } from '../../services/endpoint-service.js'
import { matchingRuleSchema } from '../../schemas/matching-rule.js'

const createBodySchema = z.object({
  name: z.string().min(1).max(100),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().min(1).startsWith('/'),
  responseStatus: z.number().int().min(100).max(599),
  responseBody: z.string().default('{}'),
  responseHeaders: z.record(z.string()).default({}),
  delay: z.number().int().min(0).max(30000).default(0),
  matchingRules: z.array(matchingRuleSchema).max(20).optional().default([]),
})

export async function createEndpointRoute(app: FastifyInstance) {
  app.post('/endpoints', async (request, reply) => {
    const body = createBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: body.error.issues })
    }

    try {
      const endpoint = await EndpointService.create(body.data)
      return reply.status(201).send(endpoint)
    } catch (err) {
      if (err instanceof EndpointServiceError) {
        const status = err.code === 'NOT_FOUND' ? 404 : 409
        return reply.status(status).send({ error: err.message, code: err.code })
      }
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
