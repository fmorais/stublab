import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { EndpointService } from '../../services/endpoint-service.js'

const listQuerySchema = z.object({
  search: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  active: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
})

export async function listEndpointsRoute(app: FastifyInstance) {
  app.get('/endpoints', async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.status(400).send({ error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: query.error.issues })
    }

    try {
      const result = await EndpointService.findAll(query.data)
      return reply.status(200).send(result)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
