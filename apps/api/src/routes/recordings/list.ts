import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { RecordingService } from '../../services/recording-service.js'

const querySchema = z.object({
  method: z.string().optional(),
  status: z.coerce.number().int().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export async function listRecordingsRoute(app: FastifyInstance) {
  app.get('/recordings', async (request, reply) => {
    const query = querySchema.safeParse(request.query)
    if (!query.success) {
      return reply.status(400).send({ error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: query.error.issues })
    }

    const workspace = request.workspace
    const { method, status, search, limit, offset } = query.data

    const result = await RecordingService.findByWorkspace(
      workspace.id,
      { method, status, search },
      { limit, offset },
    )

    return reply.status(200).send(result)
  })
}
