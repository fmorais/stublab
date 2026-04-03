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

describe('POST /api/endpoints', () => {
  it('cria endpoint com dados válidos e retorna 201', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Listar usuários',
        method: 'GET',
        path: '/users',
        responseStatus: 200,
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.name).toBe('Listar usuários')
    expect(body.method).toBe('GET')
    expect(body.path).toBe('/users')
    expect(body.active).toBe(true)
    expect(body.responseStatus).toBe(200)
    expect(body.responseBody).toBe('{}')
    expect(body.responseHeaders).toEqual({})
    expect(body.delay).toBe(0)
    expect(body.createdAt).toBeTruthy()
    expect(body.updatedAt).toBeTruthy()

    await app.close()
  })

  it('cria endpoint com todos os campos opcionais preenchidos', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Criar usuário',
        method: 'POST',
        path: '/users',
        responseStatus: 201,
        responseBody: '{"id":1}',
        responseHeaders: { 'X-Custom': 'value' },
        delay: 500,
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.responseBody).toBe('{"id":1}')
    expect(body.responseHeaders).toEqual({ 'X-Custom': 'value' })
    expect(body.delay).toBe(500)

    await app.close()
  })

  it('retorna 400 para método HTTP inválido', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Teste',
        method: 'INVALIDO',
        path: '/test',
        responseStatus: 200,
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('retorna 400 quando path não começa com /', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Teste',
        method: 'GET',
        path: 'sem-barra',
        responseStatus: 200,
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('retorna 400 quando responseStatus está fora do range', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Teste',
        method: 'GET',
        path: '/test',
        responseStatus: 99,
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('retorna 400 quando name está vazio', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: '',
        method: 'GET',
        path: '/test',
        responseStatus: 200,
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('retorna 400 quando delay excede o máximo permitido', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Teste',
        method: 'GET',
        path: '/test',
        responseStatus: 200,
        delay: 30001,
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('retorna 409 ao criar endpoint com method+path duplicado em endpoint ativo', async () => {
    const app = await buildApp()
    await app.ready()

    await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Primeiro', method: 'GET', path: '/conflict', responseStatus: 200 },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Segundo', method: 'GET', path: '/conflict', responseStatus: 200 },
    })

    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('CONFLICT')

    await app.close()
  })

  it('retorna 400 quando campos obrigatórios estão ausentes', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('retorna 400 quando responseStatus está acima do range permitido', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Teste',
        method: 'GET',
        path: '/test',
        responseStatus: 600,
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('cria endpoint com matchingRules válidas e retorna 201 com regras no response', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Com regra',
        method: 'GET',
        path: '/com-regra',
        responseStatus: 200,
        matchingRules: [{ source: 'query', field: 'env', operator: 'eq', value: 'prod' }],
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.matchingRules).toHaveLength(1)
    expect(body.matchingRules[0]).toMatchObject({
      source: 'query',
      field: 'env',
      operator: 'eq',
      value: 'prod',
    })

    await app.close()
  })

  it('retorna 400 quando regra usa operator eq sem value', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Regra inválida',
        method: 'GET',
        path: '/regra-invalida',
        responseStatus: 200,
        matchingRules: [{ source: 'query', field: 'env', operator: 'eq' }],
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('cria endpoint com matchingRules vazio e retorna 201 com matchingRules: []', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Sem regras',
        method: 'GET',
        path: '/sem-regras',
        responseStatus: 200,
        matchingRules: [],
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().matchingRules).toEqual([])

    await app.close()
  })

  it('cria endpoint sem o campo matchingRules e retorna 201 com matchingRules: []', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Sem campo',
        method: 'GET',
        path: '/sem-campo',
        responseStatus: 200,
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().matchingRules).toEqual([])

    await app.close()
  })

  it('retorna 400 quando matchingRules contém mais de 20 regras', async () => {
    const app = await buildApp()
    await app.ready()

    const rules = Array.from({ length: 21 }, (_, i) => ({
      source: 'query',
      field: `field${i}`,
      operator: 'exists',
    }))

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        name: 'Muitas regras',
        method: 'GET',
        path: '/muitas-regras',
        responseStatus: 200,
        matchingRules: rules,
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })
})
