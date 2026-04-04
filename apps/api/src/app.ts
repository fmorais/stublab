import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import path from 'path'
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

const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { version: string }

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  })

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  })

  if (process.env.NODE_ENV === 'production') {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    await app.register(fastifyStatic, {
      root: path.join(__dirname, '..', 'public'),
      prefix: '/',
    })

    app.setNotFoundHandler((request, reply) => {
      if (
        request.url.startsWith('/api/') ||
        request.url.startsWith('/mock/') ||
        request.url === '/health'
      ) {
        return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' })
      }
      return reply.sendFile('index.html')
    })
  }

  app.get('/health', async () => ({ status: 'ok', version: pkg.version }))

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
