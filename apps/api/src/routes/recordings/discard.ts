import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { RecordingService } from '../../services/recording-service.js'

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})

export async function discardRecordingsRoute(app: FastifyInstance) {
  app.post('/recordings/discard', async (request, reply) => {
    const body = bodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: body.error.issues })
    }

    const workspace = request.workspace
    const deleted = await RecordingService.deleteMany(body.data.ids, workspace.id)

    return reply.status(200).send({ deleted })
  })
}
