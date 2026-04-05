import Fastify, { FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import path from 'path'
import { createWorkspaceRoute } from './routes/workspaces/create.js'
import { listWorkspacesRoute } from './routes/workspaces/list.js'
import { getWorkspaceRoute } from './routes/workspaces/get.js'
import { updateWorkspaceRoute } from './routes/workspaces/update.js'
import { deleteWorkspaceRoute } from './routes/workspaces/delete.js'
import { createEndpointRoute } from './routes/endpoints/create.js'
import { listEndpointsRoute } from './routes/endpoints/list.js'
import { getEndpointRoute } from './routes/endpoints/get.js'
import { updateEndpointRoute } from './routes/endpoints/update.js'
import { toggleEndpointRoute } from './routes/endpoints/toggle.js'
import { deleteEndpointRoute } from './routes/endpoints/delete.js'
import { exportEndpointsRoute } from './routes/endpoints/export.js'
import { importPreviewRoute } from './routes/endpoints/import-preview.js'
import { importEndpointsRoute } from './routes/endpoints/import.js'
import { listRecordingsRoute } from './routes/recordings/list.js'
import { getRecordingRoute } from './routes/recordings/get.js'
import { deleteRecordingRoute } from './routes/recordings/delete.js'
import { discardRecordingsRoute } from './routes/recordings/discard.js'
import { deleteAllRecordingsRoute } from './routes/recordings/delete-all.js'
import { saveRecordingRoute } from './routes/recordings/save.js'
import { saveBulkRecordingsRoute } from './routes/recordings/save-bulk.js'
import { mockHandler } from './mock/handler.js'
import { WorkspaceService } from './services/workspace-service.js'
import { proxyConfigRoute } from './routes/config/proxy.js'
// workspace type augmentation — importar o arquivo que declara a extensão
import './routes/endpoints/workspace-hook.js'

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

  // Rotas de workspaces (CRUD)
  await app.register(async (api) => {
    await api.register(createWorkspaceRoute)
    await api.register(listWorkspacesRoute)
    await api.register(getWorkspaceRoute)
    await api.register(updateWorkspaceRoute)
    await api.register(deleteWorkspaceRoute)
  }, { prefix: '/api' })

  // Rotas de endpoints escopadas por workspace.
  // Por que: o hook addHook('preHandler') é registrado diretamente no escopo wsApi
  // (não via sub-plugin) para que se aplique a todas as rotas registradas no mesmo escopo.
  // Se registrado via wsApi.register(workspaceHook), os hooks ficam isolados no sub-escopo
  // e não propagam para plugins irmãos — comportamento padrão de Fastify.
  await app.register(async (wsApi) => {
    wsApi.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
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

    await wsApi.register(createEndpointRoute)
    await wsApi.register(listEndpointsRoute)
    await wsApi.register(getEndpointRoute)
    await wsApi.register(updateEndpointRoute)
    await wsApi.register(toggleEndpointRoute)
    await wsApi.register(deleteEndpointRoute)
    await wsApi.register(exportEndpointsRoute)
    await wsApi.register(importPreviewRoute)
    await wsApi.register(importEndpointsRoute)
    await wsApi.register(listRecordingsRoute)
    await wsApi.register(getRecordingRoute)
    await wsApi.register(deleteRecordingRoute)
    await wsApi.register(discardRecordingsRoute)
    await wsApi.register(deleteAllRecordingsRoute)
    await wsApi.register(saveRecordingRoute)
    await wsApi.register(saveBulkRecordingsRoute)
  }, { prefix: '/api/workspaces/:slug' })

  await app.register(async (configApi) => {
    await configApi.register(proxyConfigRoute)
  }, { prefix: '/api/config' })

  await app.register(mockHandler)

  return app
}
