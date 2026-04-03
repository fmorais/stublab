import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { EndpointService, EndpointServiceError } from '../../services/endpoint-service.js'
import { matchingRuleSchema } from '../../schemas/matching-rule.js'

const paramsSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
})

const updateBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  path: z.string().min(1).startsWith('/').optional(),
  responseStatus: z.number().int().min(100).max(599).optional(),
  responseBody: z.string().optional(),
  responseHeaders: z.record(z.string()).optional(),
  delay: z.number().int().min(0).max(30000).optional(),
  matchingRules: z.array(matchingRuleSchema).max(20).optional(),
})

export async function updateEndpointRoute(app: FastifyInstance) {
  app.put('/endpoints/:id', async (request, reply) => {
    const params = paramsSchema.safeParse(request.params)
    if (!params.success) {
      return reply.status(400).send({ error: 'ID inválido', code: 'VALIDATION_ERROR' })
    }
    const { id } = params.data

    const body = updateBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: body.error.issues })
    }

    try {
      const endpoint = await EndpointService.update(id, body.data)
      return reply.status(200).send(endpoint)
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
