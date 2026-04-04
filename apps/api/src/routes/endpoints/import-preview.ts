import { FastifyInstance } from 'fastify'
import { importPreviewBodySchema } from '../../schemas/import-export.js'
// importPreviewBodySchema usa looseExportFileSchema intencionalmente — ver schemas/import-export.ts
import { ImportExportService } from '../../services/import-export-service.js'

export async function importPreviewRoute(app: FastifyInstance) {
  app.post('/endpoints/import/preview', async (request, reply) => {
    const body = importPreviewBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Formato inválido', code: 'INVALID_FORMAT', details: body.error.issues })
    }

    try {
      const preview = await ImportExportService.previewImport(body.data.data)
      return reply.status(200).send(preview)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
