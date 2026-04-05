import { FastifyInstance } from 'fastify'
import { isProxyGloballyEnabled, getProxyTimeoutMs } from '../../config/env.js'

export async function proxyConfigRoute(fastify: FastifyInstance) {
  fastify.get('/proxy', async (_request, reply) => {
    return reply.send({
      globallyEnabled: isProxyGloballyEnabled(),
      timeoutMs: getProxyTimeoutMs(),
    })
  })
}
