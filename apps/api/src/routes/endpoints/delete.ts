import { FastifyInstance } from 'fastify'
import { EndpointService } from '../../services/endpoint-service.js'

export async function deleteEndpointRoute(app: FastifyInstance) {
  app.delete('/endpoints/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      const deleted = await EndpointService.delete(id)
      if (!deleted) {
        return reply.status(404).send({ error: `Endpoint com id ${id} não encontrado`, code: 'NOT_FOUND' })
      }
      return reply.status(204).send()
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
