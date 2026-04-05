import { beforeEach, describe, it, expect, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../../src/db/schema.js'

let testDb: BetterSQLite3Database<typeof schema>

vi.mock('../../src/db/index.js', () => ({
  get db() {
    return testDb
  },
}))

const {
  RecordingService,
  computeGroupKey,
  filterRequestHeaders,
  filterResponseHeaders,
  truncateBody,
} = await import('../../src/services/recording-service.js')

const DEFAULT_WS = '00000000-0000-0000-0000-000000000001'

beforeEach(() => {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: './drizzle' })
})

describe('computeGroupKey', () => {
  it('mesmo input produz o mesmo hash', () => {
    const k1 = computeGroupKey('GET', '/api/users', 200, '{"ok":true}')
    const k2 = computeGroupKey('GET', '/api/users', 200, '{"ok":true}')
    expect(k1).toBe(k2)
  })

  it('inputs diferentes produzem hashes diferentes', () => {
    const k1 = computeGroupKey('GET', '/api/users', 200, null)
    const k2 = computeGroupKey('POST', '/api/users', 201, null)
    expect(k1).not.toBe(k2)
  })

  it('body null é tratado como string vazia', () => {
    const k1 = computeGroupKey('GET', '/api/users', 200, null)
    const k2 = computeGroupKey('GET', '/api/users', 200, '')
    expect(k1).toBe(k2)
  })

  it('método é comparado case-insensitive', () => {
    const k1 = computeGroupKey('get', '/api/users', 200, null)
    const k2 = computeGroupKey('GET', '/api/users', 200, null)
    expect(k1).toBe(k2)
  })
})

describe('filterRequestHeaders', () => {
  it('remove headers filtrados (host, connection)', () => {
    const result = filterRequestHeaders({
      host: 'example.com',
      connection: 'keep-alive',
      'content-type': 'application/json',
    })
    expect(result['host']).toBeUndefined()
    expect(result['connection']).toBeUndefined()
    expect(result['content-type']).toBe('application/json')
  })

  it('remove headers x-stublab-*', () => {
    const result = filterRequestHeaders({
      'x-stublab-proxied': 'true',
      authorization: 'Bearer token',
    })
    expect(result['x-stublab-proxied']).toBeUndefined()
    expect(result['authorization']).toBe('Bearer token')
  })

  it('remove headers x-forwarded-*', () => {
    const result = filterRequestHeaders({
      'x-forwarded-for': '1.2.3.4',
      accept: 'application/json',
    })
    expect(result['x-forwarded-for']).toBeUndefined()
    expect(result['accept']).toBe('application/json')
  })

  it('normaliza chaves para lowercase', () => {
    const result = filterRequestHeaders({ 'Content-Type': 'application/json' })
    expect(result['content-type']).toBe('application/json')
  })

  it('ignora valores undefined', () => {
    const result = filterRequestHeaders({ 'x-missing': undefined })
    expect(result['x-missing']).toBeUndefined()
  })

  it('junta array de valores com vírgula', () => {
    const result = filterRequestHeaders({ accept: ['text/html', 'application/json'] })
    expect(result['accept']).toBe('text/html, application/json')
  })
})

describe('filterResponseHeaders', () => {
  it('remove headers filtrados (transfer-encoding, content-length, etc)', () => {
    const result = filterResponseHeaders({
      'transfer-encoding': 'chunked',
      'content-length': '100',
      'content-encoding': 'gzip',
      connection: 'keep-alive',
      'keep-alive': 'timeout=5',
      'content-type': 'application/json',
    })
    expect(result['transfer-encoding']).toBeUndefined()
    expect(result['content-length']).toBeUndefined()
    expect(result['content-encoding']).toBeUndefined()
    expect(result['connection']).toBeUndefined()
    expect(result['keep-alive']).toBeUndefined()
    expect(result['content-type']).toBe('application/json')
  })

  it('remove headers x-stublab-* e x-forwarded-*', () => {
    const result = filterResponseHeaders({
      'x-stublab-proxied': 'true',
      'x-forwarded-host': 'example.com',
      'x-request-id': 'abc123',
    })
    expect(result['x-stublab-proxied']).toBeUndefined()
    expect(result['x-forwarded-host']).toBeUndefined()
    expect(result['x-request-id']).toBe('abc123')
  })
})

describe('truncateBody', () => {
  it('body pequeno é preservado integralmente', () => {
    const body = 'hello world'
    expect(truncateBody(body)).toBe(body)
  })

  it('body null retorna null', () => {
    expect(truncateBody(null)).toBeNull()
  })

  it('body vazio retorna body vazio', () => {
    expect(truncateBody('')).toBe('')
  })

  it('body maior que 1MB é truncado com marcador [truncated]', () => {
    const big = 'x'.repeat(1024 * 1024 * 2) // 2MB
    const result = truncateBody(big)
    expect(result).not.toBeNull()
    expect(result!.endsWith('\n[truncated]')).toBe(true)
    expect(result!.length).toBeLessThan(big.length)
  })

  it('body exatamente 1MB não é truncado', () => {
    const exact = 'x'.repeat(1024 * 1024)
    expect(truncateBody(exact)).toBe(exact)
  })
})

describe('RecordingService.record', () => {
  it('primeira gravação cria registro no banco', async () => {
    await RecordingService.record({
      workspaceId: DEFAULT_WS,
      method: 'GET',
      path: '/api/users',
      requestHeaders: { 'content-type': 'application/json' },
      requestBody: null,
      responseStatus: 200,
      responseBody: '{"ok":true}',
      responseHeaders: { 'content-type': 'application/json' },
    })

    const result = await RecordingService.findByWorkspace(DEFAULT_WS)
    expect(result.total).toBe(1)
    expect(result.data[0].method).toBe('GET')
    expect(result.data[0].path).toBe('/api/users')
    expect(result.data[0].groupCount).toBe(1)
  })

  it('segunda gravação com mesmo groupKey incrementa groupCount', async () => {
    const input = {
      workspaceId: DEFAULT_WS,
      method: 'GET',
      path: '/api/users',
      requestHeaders: {},
      requestBody: null,
      responseStatus: 200,
      responseBody: '{"ok":true}',
      responseHeaders: {},
    }

    await RecordingService.record(input)
    await RecordingService.record(input)

    const result = await RecordingService.findByWorkspace(DEFAULT_WS)
    expect(result.total).toBe(1)
    expect(result.data[0].groupCount).toBe(2)
  })

  it('gravações com respostas diferentes criam registros separados', async () => {
    await RecordingService.record({
      workspaceId: DEFAULT_WS,
      method: 'GET',
      path: '/api/users',
      requestHeaders: {},
      requestBody: null,
      responseStatus: 200,
      responseBody: '{"data":[]}',
      responseHeaders: {},
    })

    await RecordingService.record({
      workspaceId: DEFAULT_WS,
      method: 'GET',
      path: '/api/users',
      requestHeaders: {},
      requestBody: null,
      responseStatus: 404,
      responseBody: '{"error":"not found"}',
      responseHeaders: {},
    })

    const result = await RecordingService.findByWorkspace(DEFAULT_WS)
    expect(result.total).toBe(2)
  })
})

describe('RecordingService.findByWorkspace', () => {
  it('retorna lista vazia quando não há gravações', async () => {
    const result = await RecordingService.findByWorkspace(DEFAULT_WS)
    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
  })

  it('filtra por método', async () => {
    await RecordingService.record({
      workspaceId: DEFAULT_WS, method: 'GET', path: '/a',
      requestHeaders: {}, requestBody: null, responseStatus: 200, responseBody: null, responseHeaders: {},
    })
    await RecordingService.record({
      workspaceId: DEFAULT_WS, method: 'POST', path: '/b',
      requestHeaders: {}, requestBody: null, responseStatus: 201, responseBody: null, responseHeaders: {},
    })

    const result = await RecordingService.findByWorkspace(DEFAULT_WS, { method: 'GET' })
    expect(result.total).toBe(1)
    expect(result.data[0].method).toBe('GET')
  })

  it('filtra por status', async () => {
    await RecordingService.record({
      workspaceId: DEFAULT_WS, method: 'GET', path: '/ok',
      requestHeaders: {}, requestBody: null, responseStatus: 200, responseBody: null, responseHeaders: {},
    })
    await RecordingService.record({
      workspaceId: DEFAULT_WS, method: 'GET', path: '/error',
      requestHeaders: {}, requestBody: null, responseStatus: 500, responseBody: null, responseHeaders: {},
    })

    const result = await RecordingService.findByWorkspace(DEFAULT_WS, { status: 500 })
    expect(result.total).toBe(1)
    expect(result.data[0].responseStatus).toBe(500)
  })
})

describe('RecordingService.delete', () => {
  it('deleta gravação existente e retorna true', async () => {
    await RecordingService.record({
      workspaceId: DEFAULT_WS, method: 'GET', path: '/del',
      requestHeaders: {}, requestBody: null, responseStatus: 200, responseBody: null, responseHeaders: {},
    })

    const { data } = await RecordingService.findByWorkspace(DEFAULT_WS)
    const deleted = await RecordingService.delete(data[0].id, DEFAULT_WS)
    expect(deleted).toBe(true)

    const after = await RecordingService.findByWorkspace(DEFAULT_WS)
    expect(after.total).toBe(0)
  })

  it('retorna false para id inexistente', async () => {
    const deleted = await RecordingService.delete('00000000-0000-0000-0000-000000000099', DEFAULT_WS)
    expect(deleted).toBe(false)
  })
})
