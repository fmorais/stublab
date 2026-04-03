import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { EndpointService } from '../../services/endpoint-service.js'

const paramsSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
})

export async function deleteEndpointRoute(app: FastifyInstance) {
  app.delete('/endpoints/:id', async (request, reply) => {
    const params = paramsSchema.safeParse(request.params)
    if (!params.success) {
      return reply.status(400).send({ error: 'ID inválido', code: 'VALIDATION_ERROR' })
    }
    const { id } = params.data

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
