import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { endpoints } from '../../db/schema.js'
import { RecordingService } from '../../services/recording-service.js'
import { EndpointService } from '../../services/endpoint-service.js'
import type { HttpMethod } from '../../types/endpoint.js'

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  skipConflicts: z.boolean().default(true),
})

export async function saveBulkRecordingsRoute(app: FastifyInstance) {
  app.post('/recordings/save-bulk', async (request, reply) => {
    const body = bodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: body.error.issues })
    }

    const workspace = request.workspace
    const { ids, skipConflicts } = body.data

    let created = 0
    let skipped = 0
    let deleted = 0
    const errors: string[] = []

    for (const id of ids) {
      const recording = await RecordingService.findById(id, workspace.id)
      if (!recording) {
        errors.push(`Gravação ${id} não encontrada`)
        continue
      }

      const existingEndpoints = await db
        .select({ id: endpoints.id })
        .from(endpoints)
        .where(and(
          eq(endpoints.workspaceId, workspace.id),
          eq(endpoints.method, recording.method),
          eq(endpoints.path, recording.path),
          eq(endpoints.active, true),
        ))

      if (existingEndpoints.length > 0) {
        if (skipConflicts) {
          skipped++
          continue
        }
      }

      try {
        await EndpointService.create({
          workspaceId: workspace.id,
          name: `${recording.method} ${recording.path}`,
          method: recording.method as HttpMethod,
          path: recording.path,
          responseStatus: recording.responseStatus,
          responseBody: recording.responseBody ?? '{}',
          responseHeaders: recording.responseHeaders,
          delay: 0,
        })
        created++

        await RecordingService.delete(id, workspace.id)
        deleted++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push(`Erro ao salvar gravação ${id}: ${message}`)
      }
    }

    return reply.status(200).send({ created, skipped, deleted, errors })
  })
}
