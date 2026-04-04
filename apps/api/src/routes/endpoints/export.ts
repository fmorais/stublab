import { FastifyInstance } from 'fastify'
import { ImportExportService, ImportExportServiceError } from '../../services/import-export-service.js'

export async function exportEndpointsRoute(app: FastifyInstance) {
  app.get('/endpoints/export', async (request, reply) => {
    const query = request.query as Record<string, string>
    let ids: string[] | undefined

    if (query.ids !== undefined) {
      const parts = query.ids.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
      if (parts.length === 0) {
        return reply.status(400).send({ error: 'Parâmetro ids inválido', code: 'VALIDATION_ERROR' })
      }
      ids = parts
    }

    try {
      const data = await ImportExportService.exportEndpoints(ids)
      return reply.status(200).send(data)
    } catch (err) {
      if (err instanceof ImportExportServiceError) {
        return reply.status(404).send({ error: err.message, code: err.code })
      }
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
