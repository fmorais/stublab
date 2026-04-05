import { FastifyInstance } from 'fastify'
import { RecordingService } from '../../services/recording-service.js'

export async function getRecordingRoute(app: FastifyInstance) {
  app.get('/recordings/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspace = request.workspace

    const recording = await RecordingService.findById(id, workspace.id)
    if (!recording) {
      return reply.status(404).send({ error: 'Gravação não encontrada', code: 'RECORDING_NOT_FOUND' })
    }

    return reply.status(200).send(recording)
  })
}
