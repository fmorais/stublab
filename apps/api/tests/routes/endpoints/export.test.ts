import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../../../src/db/schema.js'

let testDb: BetterSQLite3Database<typeof schema>

vi.mock('../../../src/db/index.js', () => ({
  get db() {
    return testDb
  },
}))

const { buildApp } = await import('../../../src/app.js')

beforeEach(() => {
  const sqlite = new Database(':memory:')
  testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: './drizzle' })
})

async function createEndpoint(
  app: Awaited<ReturnType<typeof buildApp>>,
  overrides: Record<string, unknown> = {},
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/endpoints',
    payload: {
      name: 'Test endpoint',
      method: 'GET',
      path: '/test',
      responseStatus: 200,
      ...overrides,
    },
  })
  return res.json()
}

describe('GET /api/endpoints/export', () => {
  it('exporta todos os endpoints quando nenhum ID é fornecido', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { name: 'Endpoint A', method: 'GET', path: '/endpoint-a' })
    await createEndpoint(app, { name: 'Endpoint B', method: 'POST', path: '/endpoint-b' })

    const res = await app.inject({ method: 'GET', url: '/api/endpoints/export' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.version).toBe('1')
    expect(body.exportedBy).toBe('StubLab')
    expect(body.exportedAt).toBeTruthy()
    expect(body.count).toBe(2)
    expect(body.endpoints).toHaveLength(2)

    for (const ep of body.endpoints) {
      expect(ep).not.toHaveProperty('id')
      expect(ep).not.toHaveProperty('createdAt')
      expect(ep).not.toHaveProperty('updatedAt')
      expect(ep).toHaveProperty('name')
      expect(ep).toHaveProperty('method')
      expect(ep).toHaveProperty('path')
      expect(ep).toHaveProperty('active')
      expect(ep).toHaveProperty('responseStatus')
      expect(ep).toHaveProperty('responseBody')
      expect(ep).toHaveProperty('responseHeaders')
      expect(ep).toHaveProperty('delay')
      expect(ep).toHaveProperty('matchingRules')
    }

    await app.close()
  })

  it('exporta apenas os endpoints cujos IDs foram fornecidos', async () => {
    const app = await buildApp()
    await app.ready()

    const ep1 = await createEndpoint(app, { name: 'Endpoint A', method: 'GET', path: '/ep-a' })
    await createEndpoint(app, { name: 'Endpoint B', method: 'POST', path: '/ep-b' })

    const res = await app.inject({
      method: 'GET',
      url: `/api/endpoints/export?ids=${ep1.id}`,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.count).toBe(1)
    expect(body.endpoints).toHaveLength(1)
    expect(body.endpoints[0].name).toBe('Endpoint A')
    expect(body.endpoints[0].path).toBe('/ep-a')

    await app.close()
  })

  it('exporta endpoint com matchingRules sem id/endpointId/createdAt nas regras', async () => {
    const app = await buildApp()
    await app.ready()

    const ep = await createEndpoint(app, {
      name: 'Com regra',
      method: 'GET',
      path: '/com-regra',
      matchingRules: [{ source: 'query', field: 'env', operator: 'eq', value: 'prod' }],
    })

    const res = await app.inject({
      method: 'GET',
      url: `/api/endpoints/export?ids=${ep.id}`,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.count).toBe(1)
    const exportedEp = body.endpoints[0]
    expect(exportedEp.matchingRules).toHaveLength(1)

    const rule = exportedEp.matchingRules[0]
    expect(rule.source).toBe('query')
    expect(rule.field).toBe('env')
    expect(rule.operator).toBe('eq')
    expect(rule.value).toBe('prod')
    expect(rule).not.toHaveProperty('id')
    expect(rule).not.toHaveProperty('endpointId')
    expect(rule).not.toHaveProperty('createdAt')

    await app.close()
  })

  it('retorna 404 quando ID fornecido não existe', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/api/endpoints/export?ids=00000000-0000-0000-0000-000000000000',
    })

    expect(res.statusCode).toBe(404)
    const body = res.json()
    expect(body.code).toBe('NOT_FOUND')

    await app.close()
  })

  it('retorna 400 quando ids contém valor que não é UUID', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/api/endpoints/export?ids=not-a-uuid',
    })

    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('retorna count=0 e endpoints=[] quando não há endpoints cadastrados', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/endpoints/export' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.count).toBe(0)
    expect(body.endpoints).toEqual([])

    await app.close()
  })
})
