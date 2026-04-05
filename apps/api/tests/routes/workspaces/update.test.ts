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

describe('PUT /api/workspaces/:slug — proxy fields', () => {
  it('salva proxyUrl e proxyEnabled=true válidos e retorna 200', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { proxyUrl: 'https://api.example.com', proxyEnabled: true },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.proxyUrl).toBe('https://api.example.com')
    expect(body.proxyEnabled).toBe(true)

    await app.close()
  })

  it('remove trailing slash da proxyUrl ao salvar', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { proxyUrl: 'https://api.example.com/', proxyEnabled: true },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().proxyUrl).toBe('https://api.example.com')

    await app.close()
  })

  it('aceita proxyUrl=null para limpar a URL', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { proxyUrl: null, proxyEnabled: false },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().proxyUrl).toBeNull()

    await app.close()
  })

  it('rejeita proxyUrl com path (retorna 400)', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { proxyUrl: 'https://api.example.com/v1', proxyEnabled: true },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('rejeita proxyUrl com query string (retorna 400)', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { proxyUrl: 'https://api.example.com?key=value', proxyEnabled: true },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('rejeita proxyUrl com hash (retorna 400)', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { proxyUrl: 'https://api.example.com#section', proxyEnabled: true },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('rejeita proxyUrl com credenciais (retorna 400)', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { proxyUrl: 'https://user:pass@api.example.com', proxyEnabled: true },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('rejeita proxyUrl com protocolo inválido (retorna 400)', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app, 'Test', 'test-ws')

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/test-ws',
      payload: { proxyUrl: 'ftp://api.example.com', proxyEnabled: true },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')

    await app.close()
  })

  it('retorna 404 para workspace inexistente', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'PUT',
      url: '/api/workspaces/nao-existe',
      payload: { proxyUrl: 'https://api.example.com', proxyEnabled: true },
    })

    expect(res.statusCode).toBe(404)

    await app.close()
  })
})
