import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { EndpointService, EndpointServiceError } from '../../services/endpoint-service.js'

const paramsSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
})

export async function toggleEndpointRoute(app: FastifyInstance) {
  app.patch('/endpoints/:id/toggle', async (request, reply) => {
    const params = paramsSchema.safeParse(request.params)
    if (!params.success) {
      return reply.status(400).send({ error: 'ID inválido', code: 'VALIDATION_ERROR' })
    }
    const { id } = params.data

    try {
      const result = await EndpointService.toggle(id, request.workspace.id)
      return reply.status(200).send(result)
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
