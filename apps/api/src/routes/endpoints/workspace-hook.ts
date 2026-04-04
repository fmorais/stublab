import { FastifyInstance } from 'fastify'
import { WorkspaceService } from '../../services/workspace-service.js'
import type { WorkspaceWithStats } from '../../types/workspace.js'

// Por que: estende o tipo do request para que todas as rotas no escopo do workspace
// tenham acesso a request.workspace sem castings repetidos.
declare module 'fastify' {
  interface FastifyRequest {
    workspace: WorkspaceWithStats
  }
}

export async function workspaceHook(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const workspace = await WorkspaceService.findBySlug(slug)
    if (!workspace) {
      return reply.status(404).send({
        error: 'Workspace não encontrado',
        code: 'WORKSPACE_NOT_FOUND',
      })
    }
    request.workspace = workspace
  })
}
