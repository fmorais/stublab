import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { endpoints } from '../../db/schema.js'
import { RecordingService } from '../../services/recording-service.js'
import { EndpointService } from '../../services/endpoint-service.js'
import type { HttpMethod } from '../../types/endpoint.js'

const bodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  delay: z.number().int().min(0).max(30000).optional(),
  overwrite: z.boolean().optional(),
})

export async function saveRecordingRoute(app: FastifyInstance) {
  app.post('/recordings/:id/save', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = bodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: body.error.issues })
    }

    const workspace = request.workspace
    const recording = await RecordingService.findById(id, workspace.id)
    if (!recording) {
      return reply.status(404).send({ error: 'Gravação não encontrada', code: 'RECORDING_NOT_FOUND' })
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
      if (!body.data.overwrite) {
        return reply.status(409).send({
          error: 'Endpoint já existe',
          code: 'ENDPOINT_CONFLICT',
          existingEndpointId: existingEndpoints[0].id,
        })
      }

      const now = new Date().toISOString()
      await db
        .update(endpoints)
        .set({ active: false, updatedAt: now })
        .where(and(
          eq(endpoints.workspaceId, workspace.id),
          eq(endpoints.method, recording.method),
          eq(endpoints.path, recording.path),
          eq(endpoints.active, true),
        ))
    }

    const endpointName = body.data.name ?? `${recording.method} ${recording.path}`
    const endpoint = await EndpointService.create({
      workspaceId: workspace.id,
      name: endpointName,
      method: recording.method as HttpMethod,
      path: recording.path,
      responseStatus: recording.responseStatus,
      responseBody: recording.responseBody ?? '{}',
      responseHeaders: recording.responseHeaders,
      delay: body.data.delay ?? 0,
    })

    await RecordingService.delete(id, workspace.id)

    return reply.status(201).send({ endpoint, recordingDeleted: true })
  })
}
