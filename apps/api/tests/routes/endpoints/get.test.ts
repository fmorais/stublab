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

describe('GET /api/endpoints/:id', () => {
  it('retorna o endpoint quando id existe', async () => {
    const app = await buildApp()
    await app.ready()

    const created = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Meu endpoint', method: 'GET', path: '/test', responseStatus: 200 },
    })
    const { id } = created.json()

    const res = await app.inject({ method: 'GET', url: `/api/endpoints/${id}` })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(id)
    expect(body.name).toBe('Meu endpoint')
    expect(body.method).toBe('GET')
    expect(body.path).toBe('/test')

    await app.close()
  })

  it('retorna 404 quando id não existe', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/api/endpoints/00000000-0000-0000-0000-000000000000',
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('NOT_FOUND')

    await app.close()
  })

  it('retorna todos os campos do endpoint incluindo defaults', async () => {
    const app = await buildApp()
    await app.ready()

    const created = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Completo', method: 'POST', path: '/completo', responseStatus: 201 },
    })
    const { id } = created.json()

    const res = await app.inject({ method: 'GET', url: `/api/endpoints/${id}` })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.active).toBe(true)
    expect(body.responseBody).toBe('{}')
    expect(body.responseHeaders).toEqual({})
    expect(body.delay).toBe(0)
    expect(body.createdAt).toBeTruthy()
    expect(body.updatedAt).toBeTruthy()

    await app.close()
  })
})
