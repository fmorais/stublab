import { FastifyInstance } from 'fastify'
import { RecordingService } from '../../services/recording-service.js'

export async function deleteRecordingRoute(app: FastifyInstance) {
  app.delete('/recordings/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspace = request.workspace

    const deleted = await RecordingService.delete(id, workspace.id)
    if (!deleted) {
      return reply.status(404).send({ error: 'Gravação não encontrada', code: 'RECORDING_NOT_FOUND' })
    }

    return reply.status(204).send()
  })
}
