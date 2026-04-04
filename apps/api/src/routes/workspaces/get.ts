import { FastifyInstance } from 'fastify'
import { WorkspaceService } from '../../services/workspace-service.js'

export async function getWorkspaceRoute(app: FastifyInstance) {
  app.get('/workspaces/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    try {
      const workspace = await WorkspaceService.findBySlug(slug)
      if (!workspace) {
        return reply.status(404).send({ error: `Workspace '${slug}' não encontrado`, code: 'WORKSPACE_NOT_FOUND' })
      }
      return reply.status(200).send(workspace)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
