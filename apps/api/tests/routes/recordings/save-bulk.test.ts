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

async function createRecording(method: string, path: string, responseStatus = 200) {
  await RecordingService.record({
    workspaceId: DEFAULT_WS,
    method,
    path,
    requestHeaders: {},
    requestBody: null,
    responseStatus,
    responseBody: '{"ok":true}',
    responseHeaders: {},
  })
  const { data } = await RecordingService.findByWorkspace(DEFAULT_WS, { method, search: path })
  return data[0]
}

describe('POST /api/workspaces/:slug/recordings/save-bulk', () => {
  it('salva múltiplas gravações como endpoints', async () => {
    const r1 = await createRecording('GET', '/api/users')
    const r2 = await createRecording('POST', '/api/items')

    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings/save-bulk`,
      payload: { ids: [r1.id, r2.id] },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.created).toBe(2)
    expect(body.skipped).toBe(0)
    expect(body.deleted).toBe(2)
    expect(body.errors).toEqual([])

    await app.close()
  })

  it('skipConflicts=true (padrão) pula gravações com conflito', async () => {
    const app = await buildApp()
    await app.ready()

    // Criar endpoint existente
    await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/endpoints`,
      payload: { name: 'Existing', method: 'GET', path: '/api/users', responseStatus: 200 },
    })

    const r1 = await createRecording('GET', '/api/users')
    const r2 = await createRecording('POST', '/api/items')

    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings/save-bulk`,
      payload: { ids: [r1.id, r2.id], skipConflicts: true },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.created).toBe(1)
    expect(body.skipped).toBe(1)

    await app.close()
  })

  it('retorna 400 para body inválido (ids vazio)', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings/save-bulk`,
      payload: { ids: [] },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('ids inexistentes são registrados em errors', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings/save-bulk`,
      payload: { ids: ['00000000-0000-0000-0000-000000000099'] },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.created).toBe(0)
    expect(body.errors.length).toBeGreaterThan(0)

    await app.close()
  })
})
