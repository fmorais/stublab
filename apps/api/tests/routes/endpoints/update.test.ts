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

describe('PUT /api/endpoints/:id', () => {
  it('atualiza endpoint com dados válidos e retorna 200', async () => {
    const app = await buildApp()
    await app.ready()

    const created = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Original', method: 'GET', path: '/original', responseStatus: 200 },
    })
    const { id } = created.json()

    const res = await app.inject({
      method: 'PUT',
      url: `/api/endpoints/${id}`,
      payload: { name: 'Atualizado', responseStatus: 404, delay: 100 },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(id)
    expect(body.name).toBe('Atualizado')
    expect(body.responseStatus).toBe(404)
    expect(body.delay).toBe(100)
    expect(body.method).toBe('GET')
    expect(body.path).toBe('/original')

    await app.close()
  })

  it('retorna 400 para dados inválidos no body', async () => {
    const app = await buildApp()
    await app.ready()

    const created = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Teste', method: 'GET', path: '/test', responseStatus: 200 },
    })
    const { id } = created.json()

    const res = await app.inject({
      method: 'PUT',
      url: `/api/endpoints/${id}`,
      payload: { responseStatus: 99 },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('retorna 404 quando id não existe', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'PUT',
      url: '/api/endpoints/00000000-0000-0000-0000-000000000000',
      payload: { name: 'Novo nome' },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('NOT_FOUND')

    await app.close()
  })

  it('retorna 409 ao mudar method+path para combinação de outro endpoint ativo', async () => {
    const app = await buildApp()
    await app.ready()

    await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Existente', method: 'GET', path: '/existing', responseStatus: 200 },
    })

    const created = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Outro', method: 'POST', path: '/other', responseStatus: 200 },
    })
    const { id } = created.json()

    const res = await app.inject({
      method: 'PUT',
      url: `/api/endpoints/${id}`,
      payload: { method: 'GET', path: '/existing' },
    })

    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('CONFLICT')

    await app.close()
  })

  it('permite atualizar campos sem mudar method+path', async () => {
    const app = await buildApp()
    await app.ready()

    const created = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Original', method: 'GET', path: '/same', responseStatus: 200 },
    })
    const { id } = created.json()

    const res = await app.inject({
      method: 'PUT',
      url: `/api/endpoints/${id}`,
      payload: { name: 'Novo nome' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Novo nome')

    await app.close()
  })
})
