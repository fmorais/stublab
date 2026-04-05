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

describe('GET /api/workspaces/:slug/recordings/:id', () => {
  it('retorna gravação existente', async () => {
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

    const { data } = await RecordingService.findByWorkspace(DEFAULT_WS)
    const id = data[0].id

    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings/${id}`,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(id)
    expect(body.method).toBe('GET')
    expect(body.path).toBe('/api/users')

    await app.close()
  })

  it('retorna 404 para id inexistente', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings/00000000-0000-0000-0000-000000000099`,
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('RECORDING_NOT_FOUND')

    await app.close()
  })

  it('retorna 404 para workspace inexistente', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/api/workspaces/nao-existe/recordings/00000000-0000-0000-0000-000000000099',
    })

    expect(res.statusCode).toBe(404)

    await app.close()
  })
})
