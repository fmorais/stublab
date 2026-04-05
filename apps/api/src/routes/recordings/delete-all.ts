import { FastifyInstance } from 'fastify'
import { RecordingService } from '../../services/recording-service.js'

export async function deleteAllRecordingsRoute(app: FastifyInstance) {
  app.delete('/recordings', async (request, reply) => {
    const query = request.query as Record<string, string>

    if (query.all !== 'true') {
      return reply.status(400).send({
        error: 'Parâmetro all=true é obrigatório',
        code: 'VALIDATION_ERROR',
      })
    }

    const workspace = request.workspace
    const deleted = await RecordingService.deleteAll(workspace.id)

    return reply.status(200).send({ deleted })
  })
}
