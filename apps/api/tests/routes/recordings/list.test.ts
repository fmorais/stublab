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
const { RecordingService } = await import('../../../src/services/recording-service.js')

const DEFAULT_SLUG = 'default'
const DEFAULT_WS = '00000000-0000-0000-0000-000000000001'

beforeEach(() => {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: './drizzle' })
})

describe('GET /api/workspaces/:slug/recordings', () => {
  it('retorna lista vazia quando não há gravações', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings`,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toEqual([])
    expect(body.total).toBe(0)

    await app.close()
  })

  it('retorna gravações existentes', async () => {
    await RecordingService.record({
      workspaceId: DEFAULT_WS,
      method: 'GET',
      path: '/api/users',
      requestHeaders: {},
      requestBody: null,
      responseStatus: 200,
      responseBody: '{"ok":true}',
      responseHeaders: {},
    })

    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings`,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.total).toBe(1)
    expect(body.data[0].method).toBe('GET')
    expect(body.data[0].path).toBe('/api/users')

    await app.close()
  })

  it('filtra por método via query param', async () => {
    await RecordingService.record({
      workspaceId: DEFAULT_WS,
      method: 'GET',
      path: '/a',
      requestHeaders: {},
      requestBody: null,
      responseStatus: 200,
      responseBody: null,
      responseHeaders: {},
    })
    await RecordingService.record({
      workspaceId: DEFAULT_WS,
      method: 'POST',
      path: '/b',
      requestHeaders: {},
      requestBody: null,
      responseStatus: 201,
      responseBody: null,
      responseHeaders: {},
    })

    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings?method=GET`,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().total).toBe(1)

    await app.close()
  })

  it('retorna 404 para workspace inexistente', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/api/workspaces/nao-existe/recordings',
    })

    expect(res.statusCode).toBe(404)

    await app.close()
  })

  it('retorna paginação com limit e offset', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings?limit=10&offset=0`,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.limit).toBe(10)
    expect(body.offset).toBe(0)

    await app.close()
  })
})
