import { request as undiciRequest, type Dispatcher } from 'undici'
import { Readable } from 'stream'

export interface ProxyRequest {
  method: string
  path: string
  headers: Record<string, string | string[] | undefined>
  body: Readable | null
  targetBaseUrl: string
  clientIp: string
  originalHost: string
  originalProto: string
  timeoutMs: number
}

export interface ProxyResponse {
  status: number
  headers: Record<string, string | string[]>
  body: Readable
}

export class ProxyServiceError extends Error {
  constructor(
    public code: 'PROXY_TIMEOUT' | 'PROXY_ERROR',
    message: string,
    public target: string,
    public reason?: string,
  ) {
    super(message)
    this.name = 'ProxyServiceError'
  }
}

export function buildProxyHeaders(
  originalHeaders: Record<string, string | string[] | undefined>,
  targetUrl: URL,
  clientIp: string,
  originalHost: string,
  originalProto: string,
): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(originalHeaders)) {
    const lower = key.toLowerCase()
    if (lower.startsWith('x-stublab-')) continue
    if (lower === 'host') continue
    if (value === undefined) continue
    headers[key] = Array.isArray(value) ? value.join(', ') : value
  }
  headers['host'] = targetUrl.host
  headers['x-forwarded-for'] = clientIp
  headers['x-forwarded-host'] = originalHost
  headers['x-forwarded-proto'] = originalProto
  return headers
}

export const ProxyService = {
  async forward(req: ProxyRequest): Promise<ProxyResponse> {
    const targetUrl = new URL(req.targetBaseUrl)
    const fullUrl = req.targetBaseUrl + req.path
    const headers = buildProxyHeaders(req.headers, targetUrl, req.clientIp, req.originalHost, req.originalProto)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), req.timeoutMs)
    try {
      const response = await undiciRequest(fullUrl, {
        method: req.method as Dispatcher.HttpMethod,
        headers,
        body: req.body ?? undefined,
        signal: controller.signal,
      })
      clearTimeout(timer)
      const responseHeaders: Record<string, string | string[]> = {}
      for (const [key, value] of Object.entries(response.headers)) {
        if (value !== undefined) responseHeaders[key] = value as string | string[]
      }
      return {
        status: response.statusCode,
        headers: responseHeaders,
        body: response.body as unknown as Readable,
      }
    } catch (err: unknown) {
      clearTimeout(timer)
      const target = fullUrl
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ProxyServiceError('PROXY_TIMEOUT', 'Proxy timeout', target)
      }
      const reason = err instanceof Error ? err.message : String(err)
      throw new ProxyServiceError('PROXY_ERROR', 'Proxy error', target, reason)
    }
  },
}
