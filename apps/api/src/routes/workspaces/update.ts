import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { WorkspaceService, WorkspaceServiceError } from '../../services/workspace-service.js'

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(3).max(60).regex(slugRegex, 'Slug deve conter apenas letras minúsculas, números e hifens').optional(),
  proxyUrl: z.string().url().refine(
    (url) => { const p = new URL(url); return p.protocol === 'http:' || p.protocol === 'https:' },
    'Protocolo deve ser http ou https',
  ).refine(
    (url) => { const p = new URL(url); return p.pathname === '/' || p.pathname === '' },
    'URL não deve conter path',
  ).transform((url) => url.replace(/\/$/, '')).nullable().optional(),
  proxyEnabled: z.boolean().optional(),
})

export async function updateWorkspaceRoute(app: FastifyInstance) {
  app.put('/workspaces/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const body = updateWorkspaceSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: body.error.issues })
    }

    try {
      const workspace = await WorkspaceService.update(slug, body.data)
      return reply.status(200).send(workspace)
    } catch (err) {
      if (err instanceof WorkspaceServiceError) {
        if (err.code === 'NOT_FOUND') return reply.status(404).send({ error: err.message, code: err.code })
        if (err.code === 'SLUG_CONFLICT') return reply.status(409).send({ error: err.message, code: err.code })
      }
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno', code: 'INTERNAL_ERROR' })
    }
  })
}
