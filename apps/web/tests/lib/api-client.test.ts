import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '@web/lib/api-client'

// A BASE_URL é resolvida no momento do import do módulo.
// Como import.meta.env.VITE_API_URL não está definida no ambiente de teste,
// ela cai no fallback: 'http://localhost:3000/api'.
const BASE_URL = 'http://localhost:3000/api'

function makeFetchMock(overrides: Partial<Response> & { jsonData?: unknown } = {}) {
  const { jsonData = {}, ...rest } = overrides
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(jsonData),
    ...rest,
  } as unknown as Response)
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiClient.get', () => {
  it('faz requisição GET para o path correto e retorna JSON', async () => {
    const fetchMock = makeFetchMock({ jsonData: [{ id: '1' }] })
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiClient.get('/endpoints')

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/endpoints`)
    expect(init.method).toBe('GET')
    expect(result).toEqual([{ id: '1' }])
  })

  it('inclui header Content-Type: application/json', async () => {
    const fetchMock = makeFetchMock()
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.get('/endpoints')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
  })
})

describe('apiClient.post', () => {
  it('faz requisição POST com body serializado', async () => {
    const payload = { name: 'Test', method: 'GET', path: '/test', responseStatus: 200 }
    const fetchMock = makeFetchMock({ jsonData: { id: 'new-id', ...payload } })
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiClient.post('/endpoints', payload)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/endpoints`)
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(payload))
    expect(result).toMatchObject(payload)
  })
})

describe('apiClient.put', () => {
  it('faz requisição PUT com body serializado', async () => {
    const payload = { name: 'Updated' }
    const fetchMock = makeFetchMock({ jsonData: { id: '1', ...payload } })
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.put('/endpoints/1', payload)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/endpoints/1`)
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(JSON.stringify(payload))
  })
})

describe('apiClient.patch', () => {
  it('faz requisição PATCH com body serializado', async () => {
    const payload = { active: false }
    const fetchMock = makeFetchMock({ jsonData: { id: '1', active: false } })
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.patch('/endpoints/1', payload)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/endpoints/1`)
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe(JSON.stringify(payload))
  })

  it('faz requisição PATCH sem body quando nenhum argumento é passado', async () => {
    const fetchMock = makeFetchMock()
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.patch('/endpoints/1')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('PATCH')
    expect(init.body).toBeUndefined()
  })
})

describe('apiClient.del', () => {
  it('faz requisição DELETE para o path correto', async () => {
    const fetchMock = makeFetchMock({ status: 204, jsonData: undefined })
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiClient.del('/endpoints/1')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/endpoints/1`)
    expect(init.method).toBe('DELETE')
    expect(result).toBeUndefined()
  })
})

describe('tratamento de erros HTTP', () => {
  it('lança Error com status e code quando response.ok é false', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ error: 'Not found', code: 'NOT_FOUND' }),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.get('/endpoints/inexistente')).rejects.toMatchObject({
      message: 'Not found',
      status: 404,
      code: 'NOT_FOUND',
    })
  })

  it('lança Error com mensagem genérica quando resposta de erro não tem JSON válido', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('parse error')),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.get('/endpoints')).rejects.toMatchObject({
      status: 500,
      code: 'UNKNOWN',
    })
  })

  it('lança Error com status 400 para requisição inválida', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: 'Bad request', code: 'VALIDATION_ERROR' }),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.post('/endpoints', {})).rejects.toMatchObject({
      message: 'Bad request',
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })
})

describe('status 204 No Content', () => {
  it('retorna undefined quando status é 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiClient.get('/some-path')

    expect(result).toBeUndefined()
  })
})
