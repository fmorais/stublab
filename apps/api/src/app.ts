import Fastify from 'fastify'
import cors from '@fastify/cors'

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  })

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  })

  // Rotas serão registradas aqui
  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
