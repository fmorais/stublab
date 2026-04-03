import { FastifyInstance } from 'fastify'
import { EndpointService, EndpointServiceError } from '../../services/endpoint-service.js'

export async function toggleEndpointRoute(app: FastifyInstance) {
  app.patch('/endpoints/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      const result = await EndpointService.toggle(id)
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
