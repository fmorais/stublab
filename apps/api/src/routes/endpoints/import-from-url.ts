import { FastifyInstance } from 'fastify'
import { fetchOpenApiBodySchema } from '../../schemas/import-external.js'

export async function importFromUrlRoute(app: FastifyInstance) {
  app.post('/endpoints/import/from-url', async (request, reply) => {
    const body = fetchOpenApiBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'URL inválida', code: 'INVALID_URL' })
    }

    const { url } = body.data

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    let text: string
    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) {
        return reply.status(400).send({
          error: `Falha ao carregar URL: status ${res.status}`,
          code: 'FETCH_FAILED',
        })
      }
      const contentLength = res.headers.get('content-length')
      if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
        return reply.status(400).send({
          error: 'Arquivo muito grande. O tamanho máximo é 10MB.',
          code: 'FILE_TOO_LARGE',
        })
      }
      text = await res.text()
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return reply.status(400).send({
          error: 'Falha ao carregar URL: tempo limite excedido (15s)',
          code: 'FETCH_FAILED',
        })
      }
      return reply.status(400).send({
        error: 'Falha ao carregar URL: erro de conexão',
        code: 'FETCH_FAILED',
      })
    } finally {
      clearTimeout(timeout)
    }

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      try {
        const yaml = await import('js-yaml')
        data = yaml.load(text)
      } catch {
        return reply.status(400).send({
          error: 'O conteúdo da URL não é JSON ou YAML válido',
          code: 'INVALID_CONTENT',
        })
      }
    }

    if (typeof data !== 'object' || data === null) {
      return reply.status(400).send({
        error: 'O conteúdo da URL não é uma spec OpenAPI válida',
        code: 'INVALID_CONTENT',
      })
    }

    const obj = data as Record<string, unknown>
    const detectedVersion = (obj.openapi ?? obj.swagger) as string | undefined

    if (!detectedVersion) {
      return reply.status(400).send({
        error: 'O conteúdo da URL não é uma spec OpenAPI válida',
        code: 'INVALID_CONTENT',
      })
    }

    return reply.status(200).send({
      source: 'openapi',
      data,
      detectedVersion,
    })
  })
}
