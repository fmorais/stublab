import { FastifyInstance } from 'fastify'
import { importPreviewBodySchema } from '../../schemas/import-export.js'
import { externalImportPreviewBodySchema } from '../../schemas/import-external.js'
import { ImportExportService } from '../../services/import-export-service.js'
import { getParser } from '../../services/parsers/index.js'

export async function importPreviewRoute(app: FastifyInstance) {
  app.post('/endpoints/import/preview', async (request, reply) => {
    // Tentar parsear como formato externo (com source)
    const externalBody = externalImportPreviewBodySchema.safeParse(request.body)

    if (externalBody.success && externalBody.data.source !== 'stublab') {
      const { source, data } = externalBody.data
      const parser = getParser(source)

      let result
      try {
        result = await parser.parse(data)
      } catch (err) {
        request.log.error(err)
        return reply.status(500).send({ error: 'Erro interno ao processar arquivo', code: 'INTERNAL_ERROR' })
      }

      if (!result.success) {
        return reply.status(400).send({
          error: result.errors[0]?.message ?? 'Arquivo inválido',
          code: 'PARSE_ERROR',
          details: result.errors,
        })
      }

      try {
        const preview = await ImportExportService.previewFromParsedEndpoints(
          request.workspace.id,
          result.endpoints,
        )
        return reply.status(200).send({ ...preview, endpoints: result.endpoints })
      } catch (err) {
        request.log.error(err)
        return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
      }
    }

    // Fluxo retrocompatível: body sem source ou source=stublab
    const body = importPreviewBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Formato inválido', code: 'INVALID_FORMAT', details: body.error.issues })
    }

    try {
      const preview = await ImportExportService.previewImport(request.workspace.id, body.data.data)
      return reply.status(200).send(preview)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
