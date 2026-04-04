import { FastifyInstance } from 'fastify'
import { importBodySchema } from '../../schemas/import-export.js'
import { ImportExportService } from '../../services/import-export-service.js'

export async function importEndpointsRoute(app: FastifyInstance) {
  app.post('/endpoints/import', async (request, reply) => {
    const body = importBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Formato inválido', code: 'INVALID_FORMAT', details: body.error.issues })
    }

    try {
      const result = await ImportExportService.executeImport(request.workspace.id, body.data.data, body.data.strategy)
      return reply.status(200).send(result)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Falha na importação', code: 'IMPORT_FAILED' })
    }
  })
}
