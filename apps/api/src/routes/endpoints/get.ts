import { FastifyInstance } from 'fastify'
import { EndpointService } from '../../services/endpoint-service.js'

export async function getEndpointRoute(app: FastifyInstance) {
  app.get('/endpoints/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      const endpoint = await EndpointService.findById(id)
      if (!endpoint) {
        return reply.status(404).send({ error: `Endpoint com id ${id} não encontrado`, code: 'NOT_FOUND' })
      }
      return reply.status(200).send(endpoint)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
