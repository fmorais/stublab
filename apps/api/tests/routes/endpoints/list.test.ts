import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../../../src/db/schema.js'

type TestDb = ReturnType<typeof drizzle<typeof schema>>

let testDb: TestDb

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
  overrides?: Record<string, unknown>,
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/endpoints',
    payload: {
      name: 'Endpoint padrão',
      method: 'GET',
      path: '/default',
      responseStatus: 200,
      ...overrides,
    },
  })
  return res.json()
}

describe('GET /api/endpoints', () => {
  it('retorna lista vazia quando não há endpoints', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/endpoints' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toEqual([])
    expect(body.total).toBe(0)

    await app.close()
  })

  it('retorna todos os endpoints cadastrados', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { name: 'Listar usuários', method: 'GET', path: '/users' })
    await createEndpoint(app, { name: 'Criar usuário', method: 'POST', path: '/users' })

    const res = await app.inject({ method: 'GET', url: '/api/endpoints' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.total).toBe(2)
    expect(body.data).toHaveLength(2)

    await app.close()
  })

  it('filtra por method', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { name: 'GET endpoint', method: 'GET', path: '/get-only' })
    await createEndpoint(app, { name: 'POST endpoint', method: 'POST', path: '/post-only' })

    const res = await app.inject({ method: 'GET', url: '/api/endpoints?method=POST' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.total).toBe(1)
    expect(body.data[0].method).toBe('POST')

    await app.close()
  })

  it('filtra por active=true', async () => {
    const app = await buildApp()
    await app.ready()

    const ep1 = await createEndpoint(app, { name: 'Ativo', method: 'GET', path: '/active' })
    const ep2 = await createEndpoint(app, { name: 'Inativo', method: 'POST', path: '/inactive' })

    await app.inject({ method: 'PATCH', url: `/api/endpoints/${ep2.id}/toggle` })

    const res = await app.inject({ method: 'GET', url: '/api/endpoints?active=true' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.total).toBe(1)
    expect(body.data[0].id).toBe(ep1.id)
    expect(body.data[0].active).toBe(true)

    await app.close()
  })

  it('filtra por active=false', async () => {
    const app = await buildApp()
    await app.ready()

    const ep1 = await createEndpoint(app, { name: 'Ativo', method: 'GET', path: '/active' })
    await createEndpoint(app, { name: 'Ativo também', method: 'POST', path: '/also-active' })

    await app.inject({ method: 'PATCH', url: `/api/endpoints/${ep1.id}/toggle` })

    const res = await app.inject({ method: 'GET', url: '/api/endpoints?active=false' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.total).toBe(1)
    expect(body.data[0].id).toBe(ep1.id)
    expect(body.data[0].active).toBe(false)

    await app.close()
  })

  it('filtra por search no name', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { name: 'Listar usuários', method: 'GET', path: '/users' })
    await createEndpoint(app, { name: 'Buscar produto', method: 'GET', path: '/products' })

    const res = await app.inject({ method: 'GET', url: '/api/endpoints?search=usuário' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.total).toBe(1)
    expect(body.data[0].name).toBe('Listar usuários')

    await app.close()
  })

  it('filtra por search no path', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { name: 'Usuários', method: 'GET', path: '/users' })
    await createEndpoint(app, { name: 'Produtos', method: 'GET', path: '/products' })

    const res = await app.inject({ method: 'GET', url: '/api/endpoints?search=/products' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.total).toBe(1)
    expect(body.data[0].path).toBe('/products')

    await app.close()
  })

  it('retorna 400 para method inválido no query param', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/endpoints?method=INVALIDO' })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('filtra combinando search e method', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { name: 'Listar usuários', method: 'GET', path: '/users' })
    await createEndpoint(app, { name: 'Criar usuário', method: 'POST', path: '/users' })
    await createEndpoint(app, { name: 'Buscar produto', method: 'GET', path: '/products' })

    const res = await app.inject({
      method: 'GET',
      url: '/api/endpoints?search=usuário&method=POST',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.total).toBe(1)
    expect(body.data[0].name).toBe('Criar usuário')
    expect(body.data[0].method).toBe('POST')

    await app.close()
  })

  it('retorna matchingRules em cada endpoint da lista (array, pode ser vazio)', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { name: 'Sem regras', method: 'GET', path: '/list-no-rules' })

    const res = await app.inject({ method: 'GET', url: '/api/endpoints' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.total).toBeGreaterThan(0)
    for (const endpoint of body.data) {
      expect(Array.isArray(endpoint.matchingRules)).toBe(true)
    }

    await app.close()
  })
})
