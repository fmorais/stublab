import { describe, it, expect, beforeEach, vi } from 'vitest'
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

const { buildApp } = await import('../../src/app.js')

beforeEach(() => {
  const sqlite = new Database(':memory:')
  testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: './drizzle' })
})

async function createEndpoint(
  app: Awaited<ReturnType<typeof buildApp>>,
  overrides?: Record<string, unknown>,
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/workspaces/default/endpoints',
    payload: {
      name: 'Mock endpoint',
      method: 'GET',
      path: '/users',
      responseStatus: 200,
      responseBody: '{"users":[]}',
      responseHeaders: {},
      delay: 0,
      ...overrides,
    },
  })
  return res.json()
}

describe('Mock Engine Handler — /mock/*', () => {
  it('endpoint ativo responde com status e body configurados', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, {
      responseStatus: 202,
      responseBody: '{"ok":true}',
    })

    const res = await app.inject({ method: 'GET', url: '/mock/default/users' })
    expect(res.statusCode).toBe(202)
    expect(res.body).toBe('{"ok":true}')

    await app.close()
  })

  it('endpoint ativo retorna os responseHeaders configurados', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, {
      responseHeaders: { 'X-Custom-Header': 'stub-value', 'Content-Type': 'application/json' },
    })

    const res = await app.inject({ method: 'GET', url: '/mock/default/users' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['x-custom-header']).toBe('stub-value')
    expect(res.headers['content-type']).toContain('application/json')

    await app.close()
  })

  it('retorna 404 MOCK_NOT_FOUND para path sem match', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/mock/default/nonexistent' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'No mock found', code: 'MOCK_NOT_FOUND' })

    await app.close()
  })

  it('endpoint inativo não responde (retorna 404)', async () => {
    const app = await buildApp()
    await app.ready()

    const created = await createEndpoint(app)

    await app.inject({
      method: 'PATCH',
      url: `/api/workspaces/default/endpoints/${created.id}/toggle`,
    })

    const res = await app.inject({ method: 'GET', url: '/mock/default/users' })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('MOCK_NOT_FOUND')

    await app.close()
  })

  it('método correto faz match, método diferente retorna 404', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { method: 'POST', path: '/items', responseStatus: 201 })

    const okRes = await app.inject({ method: 'POST', url: '/mock/default/items' })
    expect(okRes.statusCode).toBe(201)

    const failRes = await app.inject({ method: 'GET', url: '/mock/default/items' })
    expect(failRes.statusCode).toBe(404)
    expect(failRes.json().code).toBe('MOCK_NOT_FOUND')

    await app.close()
  })

  it('aplica delay configurado antes de responder', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { delay: 80 })

    const start = Date.now()
    const res = await app.inject({ method: 'GET', url: '/mock/default/users' })
    const elapsed = Date.now() - start

    expect(res.statusCode).toBe(200)
    expect(elapsed).toBeGreaterThanOrEqual(70)

    await app.close()
  })

  it('faz match em path com parâmetro dinâmico', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, {
      path: '/users/:id',
      responseStatus: 200,
      responseBody: '{"found":true}',
    })

    const res = await app.inject({ method: 'GET', url: '/mock/default/users/42' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('{"found":true}')

    await app.close()
  })

  it('path estático tem prioridade sobre path dinâmico', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, {
      name: 'Dynamic',
      path: '/users/:id',
      responseStatus: 200,
      responseBody: '{"type":"dynamic"}',
    })

    await createEndpoint(app, {
      name: 'Static',
      path: '/users/me',
      responseStatus: 200,
      responseBody: '{"type":"static"}',
    })

    const res = await app.inject({ method: 'GET', url: '/mock/default/users/me' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('{"type":"static"}')

    await app.close()
  })

  it('request com query param correto aciona endpoint com regra de query', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, {
      name: 'Query rule endpoint',
      method: 'GET',
      path: '/catalog',
      responseStatus: 200,
      responseBody: '{"filtered":true}',
      matchingRules: [
        { source: 'query', field: 'category', operator: 'eq', value: 'books' },
      ],
    })

    const res = await app.inject({ method: 'GET', url: '/mock/default/catalog?category=books' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('{"filtered":true}')

    await app.close()
  })

  it('request sem query param esperado retorna 404 (sem fallback)', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, {
      name: 'Query rule endpoint',
      method: 'GET',
      path: '/catalog',
      responseStatus: 200,
      responseBody: '{"filtered":true}',
      matchingRules: [
        { source: 'query', field: 'category', operator: 'eq', value: 'books' },
      ],
    })

    // Sem o query param correto — regra não satisfeita, nenhum fallback → 404
    const res = await app.inject({ method: 'GET', url: '/mock/default/catalog?category=electronics' })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('MOCK_NOT_FOUND')

    await app.close()
  })

  it('request com header específico aciona endpoint com regra de header', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, {
      name: 'Header rule endpoint',
      method: 'GET',
      path: '/tenant-data',
      responseStatus: 200,
      responseBody: '{"tenant":"acme"}',
      matchingRules: [
        { source: 'header', field: 'x-tenant-id', operator: 'eq', value: 'acme' },
      ],
    })

    const res = await app.inject({
      method: 'GET',
      url: '/mock/default/tenant-data',
      headers: { 'x-tenant-id': 'acme' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('{"tenant":"acme"}')

    await app.close()
  })

  it('request com header errado retorna 404 (sem fallback)', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, {
      name: 'Header rule endpoint',
      method: 'GET',
      path: '/tenant-data',
      responseStatus: 200,
      responseBody: '{"tenant":"acme"}',
      matchingRules: [
        { source: 'header', field: 'x-tenant-id', operator: 'eq', value: 'acme' },
      ],
    })

    const res = await app.inject({
      method: 'GET',
      url: '/mock/default/tenant-data',
      headers: { 'x-tenant-id': 'other' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('MOCK_NOT_FOUND')

    await app.close()
  })

  it('request com body JSON específico aciona endpoint com regra de body', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, {
      name: 'Body rule endpoint',
      method: 'POST',
      path: '/payments',
      responseStatus: 200,
      responseBody: '{"method":"pix"}',
      matchingRules: [
        { source: 'body', field: 'type', operator: 'eq', value: 'pix' },
      ],
    })

    const res = await app.inject({
      method: 'POST',
      url: '/mock/default/payments',
      headers: { 'content-type': 'application/json' },
      payload: { type: 'pix', amount: 100 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('{"method":"pix"}')

    await app.close()
  })

  it('body não-JSON faz regra de body falhar; sem fallback retorna 404', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, {
      name: 'Body rule endpoint',
      method: 'POST',
      path: '/data-upload',
      responseStatus: 200,
      responseBody: '{"ok":true}',
      matchingRules: [
        { source: 'body', field: 'type', operator: 'eq', value: 'json' },
      ],
    })

    // Content-Type não é application/json — body tratado como null
    const res = await app.inject({
      method: 'POST',
      url: '/mock/default/data-upload',
      headers: { 'content-type': 'text/plain' },
      payload: 'type=json',
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('MOCK_NOT_FOUND')

    await app.close()
  })
})
