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

async function createRecording(overrides?: { method?: string; path?: string; responseStatus?: number; responseBody?: string | null }) {
  await RecordingService.record({
    workspaceId: DEFAULT_WS,
    method: overrides?.method ?? 'GET',
    path: overrides?.path ?? '/api/users',
    requestHeaders: {},
    requestBody: null,
    responseStatus: overrides?.responseStatus ?? 200,
    responseBody: overrides?.responseBody ?? '{"ok":true}',
    responseHeaders: { 'content-type': 'application/json' },
  })
  const { data } = await RecordingService.findByWorkspace(DEFAULT_WS)
  return data[data.length - 1]
}

describe('POST /api/workspaces/:slug/recordings/:id/save', () => {
  it('salva gravação como endpoint e deleta gravação', async () => {
    const recording = await createRecording()

    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings/${recording.id}/save`,
      payload: {},
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.recordingDeleted).toBe(true)
    expect(body.endpoint).toBeDefined()
    expect(body.endpoint.method).toBe('GET')
    expect(body.endpoint.path).toBe('/api/users')
    expect(body.endpoint.responseStatus).toBe(200)

    const after = await RecordingService.findByWorkspace(DEFAULT_WS)
    expect(after.total).toBe(0)

    await app.close()
  })

  it('usa name personalizado quando fornecido', async () => {
    const recording = await createRecording()

    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings/${recording.id}/save`,
      payload: { name: 'Meu endpoint customizado' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().endpoint.name).toBe('Meu endpoint customizado')

    await app.close()
  })

  it('retorna 409 quando endpoint ativo já existe com mesmo method+path', async () => {
    const app = await buildApp()
    await app.ready()

    // Criar endpoint existente
    await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/endpoints`,
      payload: { name: 'Existing', method: 'GET', path: '/api/users', responseStatus: 200 },
    })

    const recording = await createRecording()

    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings/${recording.id}/save`,
      payload: {},
    })

    expect(res.statusCode).toBe(409)
    const body = res.json()
    expect(body.code).toBe('ENDPOINT_CONFLICT')
    expect(body.existingEndpointId).toBeDefined()

    await app.close()
  })

  it('overwrite=true desativa endpoint existente e cria novo', async () => {
    const app = await buildApp()
    await app.ready()

    await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/endpoints`,
      payload: { name: 'Existing', method: 'GET', path: '/api/users', responseStatus: 200 },
    })

    const recording = await createRecording()

    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings/${recording.id}/save`,
      payload: { overwrite: true },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().endpoint).toBeDefined()

    await app.close()
  })

  it('retorna 404 para gravação inexistente', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${DEFAULT_SLUG}/recordings/00000000-0000-0000-0000-000000000099/save`,
      payload: {},
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('RECORDING_NOT_FOUND')

    await app.close()
  })
})
