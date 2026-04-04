import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { WorkspaceService, WorkspaceServiceError } from '../../services/workspace-service.js'

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(60).regex(slugRegex, 'Slug deve conter apenas letras minúsculas, números e hifens'),
})

export async function createWorkspaceRoute(app: FastifyInstance) {
  app.post('/workspaces', async (request, reply) => {
    const body = createWorkspaceSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: body.error.issues })
    }

    try {
      const workspace = await WorkspaceService.create(body.data)
      return reply.status(201).send(workspace)
    } catch (err) {
      if (err instanceof WorkspaceServiceError) {
        const status = err.code === 'SLUG_CONFLICT' ? 409 : 400
        return reply.status(status).send({ error: err.message, code: err.code })
      }
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
