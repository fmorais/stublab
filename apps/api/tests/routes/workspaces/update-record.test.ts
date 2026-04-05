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

beforeEach(async () => {
  const sqlite = new Database(':memory:')
  testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: './drizzle' })
})

async function createWorkspace(app: Awaited<ReturnType<typeof buildApp>>, name: string, slug: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/workspaces',
    payload: { name, slug },
  })
  return res.json()
}

describe('PUT /api/workspaces/:slug — recordEnabled', () => {
  it('ativa recordEnabled com proxyEnabled=true: retorna 200', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: {
        proxyUrl: 'https://api.example.com',
        proxyEnabled: true,
        recordEnabled: true,
      },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.recordEnabled).toBe(true)
    expect(body.proxyEnabled).toBe(true)

    await app.close()
  })

  it('ativa recordEnabled com proxyEnabled já ativo no workspace: retorna 200', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    // Ativa proxy primeiro
    await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { proxyUrl: 'https://api.example.com', proxyEnabled: true },
    })

    // Agora ativa record sem passar proxyEnabled (deve ler o valor do workspace)
    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { recordEnabled: true },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().recordEnabled).toBe(true)

    await app.close()
  })

  it('ativa recordEnabled com proxyEnabled=false: retorna 400', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { proxyEnabled: false, recordEnabled: true },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('ativa recordEnabled sem proxyEnabled (workspace proxy desativado): retorna 400', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { recordEnabled: true },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('desativa recordEnabled: retorna 200 sem restrição', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { recordEnabled: false },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().recordEnabled).toBe(false)

    await app.close()
  })

  it('workspace retorna recordEnabled no payload', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/api/workspaces/default',
    })

    expect(res.statusCode).toBe(200)
    expect(typeof res.json().recordEnabled).toBe('boolean')

    await app.close()
  })
})
