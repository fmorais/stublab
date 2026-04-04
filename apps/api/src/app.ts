import Fastify from 'fastify'
import cors from '@fastify/cors'
import { createEndpointRoute } from './routes/endpoints/create.js'
import { listEndpointsRoute } from './routes/endpoints/list.js'
import { getEndpointRoute } from './routes/endpoints/get.js'
import { updateEndpointRoute } from './routes/endpoints/update.js'
import { toggleEndpointRoute } from './routes/endpoints/toggle.js'
import { deleteEndpointRoute } from './routes/endpoints/delete.js'
import { exportEndpointsRoute } from './routes/endpoints/export.js'
import { importPreviewRoute } from './routes/endpoints/import-preview.js'
import { importEndpointsRoute } from './routes/endpoints/import.js'
import { mockHandler } from './mock/handler.js'

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  })

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  })

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(async (api) => {
    await api.register(createEndpointRoute)
    await api.register(listEndpointsRoute)
    await api.register(getEndpointRoute)
    await api.register(updateEndpointRoute)
    await api.register(toggleEndpointRoute)
    await api.register(deleteEndpointRoute)
    await api.register(exportEndpointsRoute)
    await api.register(importPreviewRoute)
    await api.register(importEndpointsRoute)
  }, { prefix: '/api' })

  await app.register(mockHandler)

  return app
}
