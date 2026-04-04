import { FastifyInstance } from 'fastify'
import { WorkspaceService } from '../../services/workspace-service.js'

export async function listWorkspacesRoute(app: FastifyInstance) {
  app.get('/workspaces', async (request, reply) => {
    try {
      const data = await WorkspaceService.findAll()
      return reply.status(200).send({ data, total: data.length })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
