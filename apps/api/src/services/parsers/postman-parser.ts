import type { ExportedEndpoint } from '../../schemas/import-export.js'
import type { ExternalParser, ParseResult } from './index.js'

interface PostmanCollection {
  info: { name?: string; schema: string }
  item: PostmanItem[]
}

interface PostmanItem {
  name?: string
  request?: PostmanRequest
  item?: PostmanItem[]
}

interface PostmanRequest {
  method: string
  url: PostmanUrl | string
}

interface PostmanUrl {
  raw?: string
  path?: string[]
  host?: string[]
}

const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

function normalizePath(raw: string): string {
  // Remove protocolo+host: keep only path portion
  let p = raw
  // Remove query string
  const qIdx = p.indexOf('?')
  if (qIdx !== -1) p = p.slice(0, qIdx)
  // Remove protocol and host (e.g. https://example.com/path)
  const protocolMatch = p.match(/^https?:\/\/[^/]+(\/.*)?$/)
  if (protocolMatch) {
    p = protocolMatch[1] ?? '/'
  }
  // Normalize Postman variables: {{var}} → :var
  p = p.replace(/\{\{([^}]+)\}\}/g, ':$1')
  // Normalize OpenAPI-style params: {param} → :param
  p = p.replace(/\{([^}]+)\}/g, ':$1')
  if (!p.startsWith('/')) p = '/' + p
  return p
}

function extractPathFromUrl(url: PostmanUrl | string): string {
  if (typeof url === 'string') {
    return normalizePath(url)
  }

  if (url.path && Array.isArray(url.path)) {
    const segments = url.path.map((seg) => {
      // Normalize Postman variables in each segment
      return seg.replace(/\{\{([^}]+)\}\}/g, ':$1').replace(/\{([^}]+)\}/g, ':$1')
    })
    return '/' + segments.join('/')
  }

  if (url.raw) {
    return normalizePath(url.raw)
  }

  return '/'
}

export class PostmanParser implements ExternalParser {
  parse(content: unknown): ParseResult {
    if (typeof content !== 'object' || content === null || Array.isArray(content)) {
      return {
        success: false,
        endpoints: [],
        errors: [{ message: 'Conteúdo inválido: esperado objeto JSON' }],
      }
    }

    const col = content as Record<string, unknown>

    if (!col.info || typeof col.info !== 'object') {
      return {
        success: false,
        endpoints: [],
        errors: [{ message: 'Collection inválida: campo "info" ausente' }],
      }
    }

    const info = col.info as Record<string, unknown>

    if (typeof info.schema !== 'string' || !info.schema.includes('v2')) {
      return {
        success: false,
        endpoints: [],
        errors: [
          {
            message:
              'Versão de collection não suportada. Apenas Postman Collection v2 e v2.1 são aceitas.',
          },
        ],
      }
    }

    if (!Array.isArray(col.item)) {
      return {
        success: false,
        endpoints: [],
        errors: [{ message: 'Collection inválida: campo "item" ausente ou não é array' }],
      }
    }

    const collection = content as PostmanCollection

    const endpoints: ExportedEndpoint[] = []

    // Usar fila para evitar stack overflow em collections muito aninhadas
    const queue: PostmanItem[] = [...collection.item]

    while (queue.length > 0) {
      const item = queue.shift()!

      // É uma pasta — enfileirar sub-items
      if (item.item && Array.isArray(item.item)) {
        queue.push(...item.item)
        continue
      }

      if (!item.request) continue

      const req = item.request
      const method = (req.method ?? 'GET').toUpperCase()

      if (!VALID_METHODS.has(method)) continue

      const path = extractPathFromUrl(req.url ?? '/')
      const name = item.name ?? `${method} ${path}`

      endpoints.push({
        name,
        method: method as ExportedEndpoint['method'],
        path,
        active: true,
        responseStatus: 200,
        responseBody: '{}',
        responseHeaders: {},
        delay: 0,
        matchingRules: [],
      })
    }

    if (endpoints.length === 0) {
      return {
        success: false,
        endpoints: [],
        errors: [{ message: 'Nenhum endpoint encontrado na coleção. Verifique se a coleção contém requests.' }],
      }
    }

    return {
      success: true,
      endpoints,
      errors: [],
    }
  }
}
