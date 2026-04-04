import { FastifyInstance } from 'fastify'
import { WorkspaceService, WorkspaceServiceError } from '../../services/workspace-service.js'

export async function deleteWorkspaceRoute(app: FastifyInstance) {
  app.delete('/workspaces/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    try {
      await WorkspaceService.delete(slug)
      return reply.status(204).send()
    } catch (err) {
      if (err instanceof WorkspaceServiceError) {
        if (err.code === 'NOT_FOUND') return reply.status(404).send({ error: err.message, code: err.code })
        if (err.code === 'DEFAULT_WORKSPACE_PROTECTED') return reply.status(409).send({ error: err.message, code: err.code })
      }
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
