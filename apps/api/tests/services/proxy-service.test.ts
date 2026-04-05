import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Readable } from 'stream'

// We mock undici before importing proxy-service so the module gets the mock
vi.mock('undici', () => ({
  request: vi.fn(),
}))

const { buildProxyHeaders, ProxyService, ProxyServiceError } = await import('../../src/services/proxy-service.js')
const { request: mockRequest } = await import('undici') as { request: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildProxyHeaders', () => {
  const targetUrl = new URL('https://api.example.com')

  it('remove cabeçalho host do request original e adiciona o do target', () => {
    const headers = buildProxyHeaders(
      { host: 'stublab.local', 'content-type': 'application/json' },
      targetUrl,
      '127.0.0.1',
      'stublab.local',
      'http',
    )
    expect(headers['host']).toBe('api.example.com')
    expect(headers['content-type']).toBe('application/json')
  })

  it('adiciona cabeçalhos de forwarding corretos', () => {
    const headers = buildProxyHeaders(
      { 'accept': 'application/json' },
      targetUrl,
      '10.0.0.1',
      'stublab.local',
      'https',
    )
    expect(headers['x-forwarded-for']).toBe('10.0.0.1')
    expect(headers['x-forwarded-host']).toBe('stublab.local')
    expect(headers['x-forwarded-proto']).toBe('https')
  })

  it('remove cabeçalhos x-stublab-* do request original', () => {
    const headers = buildProxyHeaders(
      { 'x-stublab-proxied': 'true', 'authorization': 'Bearer token' },
      targetUrl,
      '127.0.0.1',
      'stublab.local',
      'http',
    )
    expect(headers['x-stublab-proxied']).toBeUndefined()
    expect(headers['authorization']).toBe('Bearer token')
  })

  it('remove cabeçalhos com valor undefined', () => {
    const headers = buildProxyHeaders(
      { 'x-maybe': undefined },
      targetUrl,
      '127.0.0.1',
      'stublab.local',
      'http',
    )
    expect(headers['x-maybe']).toBeUndefined()
  })

  it('junta array de valores em string separada por vírgula', () => {
    const headers = buildProxyHeaders(
      { 'accept': ['text/html', 'application/json'] },
      targetUrl,
      '127.0.0.1',
      'stublab.local',
      'http',
    )
    expect(headers['accept']).toBe('text/html, application/json')
  })
})

describe('ProxyService.forward', () => {
  const baseRequest = {
    method: 'GET',
    path: '/users',
    headers: { 'content-type': 'application/json' } as Record<string, string>,
    body: null,
    targetBaseUrl: 'https://api.example.com',
    clientIp: '127.0.0.1',
    originalHost: 'stublab.local',
    originalProto: 'http',
    timeoutMs: 5000,
  }

  it('retorna status, headers e body da resposta do upstream', async () => {
    const fakeBody = Readable.from(['{"ok":true}'])
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'x-custom': 'value' },
      body: fakeBody,
    })

    const result = await ProxyService.forward(baseRequest)

    expect(result.status).toBe(200)
    expect(result.headers['content-type']).toBe('application/json')
    expect(result.headers['x-custom']).toBe('value')
    expect(result.body).toBe(fakeBody)
  })

  it('chama undici com a URL e método corretos', async () => {
    const fakeBody = Readable.from(['{}'])
    mockRequest.mockResolvedValueOnce({
      statusCode: 201,
      headers: {},
      body: fakeBody,
    })

    await ProxyService.forward({ ...baseRequest, method: 'POST', path: '/items?foo=bar' })

    expect(mockRequest).toHaveBeenCalledWith(
      'https://api.example.com/items?foo=bar',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('lança ProxyServiceError com code PROXY_TIMEOUT em AbortError', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    mockRequest.mockRejectedValueOnce(abortError)

    let caught: unknown
    try {
      await ProxyService.forward({ ...baseRequest, timeoutMs: 1 })
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(ProxyServiceError)
    expect((caught as ProxyServiceError).code).toBe('PROXY_TIMEOUT')
  })

  it('lança ProxyServiceError com code PROXY_ERROR em falha de conexão', async () => {
    mockRequest.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    let caught: unknown
    try {
      await ProxyService.forward(baseRequest)
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(ProxyServiceError)
    expect((caught as ProxyServiceError).code).toBe('PROXY_ERROR')
    expect((caught as ProxyServiceError).reason).toBe('ECONNREFUSED')
  })

  it('inclui a URL do target no erro', async () => {
    mockRequest.mockRejectedValueOnce(new Error('DNS failure'))

    let caught: unknown
    try {
      await ProxyService.forward(baseRequest)
    } catch (err) {
      caught = err
    }

    expect((caught as ProxyServiceError).target).toBe('https://api.example.com/users')
  })
})
