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

describe('DELETE /api/workspaces/:slug/endpoints/:id', () => {
  it('deleta endpoint existente e retorna 204', async () => {
    const app = await buildApp()
    await app.ready()

    const created = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: { name: 'Para deletar', method: 'GET', path: '/to-delete', responseStatus: 200 },
    })
    const { id } = created.json()

    const res = await app.inject({ method: 'DELETE', url: `/api/workspaces/default/endpoints/${id}` })

    expect(res.statusCode).toBe(204)
    expect(res.body).toBe('')

    const getRes = await app.inject({ method: 'GET', url: `/api/workspaces/default/endpoints/${id}` })
    expect(getRes.statusCode).toBe(404)

    await app.close()
  })

  it('retorna 404 quando id não existe', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/workspaces/default/endpoints/00000000-0000-0000-0000-000000000000',
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('NOT_FOUND')

    await app.close()
  })

  it('deleta endpoint inativo sem erro', async () => {
    const app = await buildApp()
    await app.ready()

    const created = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: { name: 'Inativo', method: 'DELETE', path: '/inactive-delete', responseStatus: 200 },
    })
    const { id } = created.json()

    await app.inject({ method: 'PATCH', url: `/api/workspaces/default/endpoints/${id}/toggle` })

    const res = await app.inject({ method: 'DELETE', url: `/api/workspaces/default/endpoints/${id}` })

    expect(res.statusCode).toBe(204)
    expect(res.body).toBe('')

    await app.close()
  })
})
