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

describe('PATCH /api/endpoints/:id/toggle', () => {
  it('desativa endpoint ativo e retorna active=false', async () => {
    const app = await buildApp()
    await app.ready()

    const created = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Ativo', method: 'GET', path: '/toggle-test', responseStatus: 200 },
    })
    const { id } = created.json()

    const res = await app.inject({ method: 'PATCH', url: `/api/endpoints/${id}/toggle` })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(id)
    expect(body.active).toBe(false)
    expect(body.updatedAt).toBeTruthy()

    await app.close()
  })

  it('ativa endpoint inativo e retorna active=true', async () => {
    const app = await buildApp()
    await app.ready()

    const created = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Para desativar', method: 'GET', path: '/toggle-reactivate', responseStatus: 200 },
    })
    const { id } = created.json()

    await app.inject({ method: 'PATCH', url: `/api/endpoints/${id}/toggle` })

    const res = await app.inject({ method: 'PATCH', url: `/api/endpoints/${id}/toggle` })

    expect(res.statusCode).toBe(200)
    expect(res.json().active).toBe(true)

    await app.close()
  })

  it('retorna 404 quando id não existe', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/endpoints/00000000-0000-0000-0000-000000000000/toggle',
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('NOT_FOUND')

    await app.close()
  })

  it('retorna 409 ao ativar quando outro endpoint ativo tem mesmo method+path', async () => {
    const app = await buildApp()
    await app.ready()

    const first = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Primeiro', method: 'DELETE', path: '/conflict-toggle', responseStatus: 200 },
    })
    const firstId = first.json().id

    await app.inject({ method: 'PATCH', url: `/api/endpoints/${firstId}/toggle` })

    await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: { name: 'Segundo', method: 'DELETE', path: '/conflict-toggle', responseStatus: 200 },
    })

    const res = await app.inject({ method: 'PATCH', url: `/api/endpoints/${firstId}/toggle` })

    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('CONFLICT')

    await app.close()
  })
})
