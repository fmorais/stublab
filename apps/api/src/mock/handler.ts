import { FastifyInstance } from 'fastify'
import { matchEndpoint } from './engine.js'
import { EndpointService } from '../services/endpoint-service.js'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export async function mockHandler(app: FastifyInstance): Promise<void> {
  for (const method of METHODS) {
    app.route({
      method,
      url: '/mock/*',
      handler: async (request, reply) => {
        const wildcardPath = '/' + (request.params as { '*': string })['*']

        const { data: activeEndpoints } = await EndpointService.findAll({ active: true })

        const matched = matchEndpoint(method, wildcardPath, activeEndpoints)

        if (!matched) {
          return reply
            .status(404)
            .send({ error: 'No mock found', code: 'MOCK_NOT_FOUND' })
        }

        if (matched.delay > 0) {
          await new Promise<void>((r) => setTimeout(r, matched.delay))
        }

        for (const [key, value] of Object.entries(matched.responseHeaders)) {
          reply.header(key, value)
        }

        return reply.status(matched.responseStatus).send(matched.responseBody)
      },
    })
  }
}
