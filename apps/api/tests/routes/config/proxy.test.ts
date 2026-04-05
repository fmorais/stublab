import { describe, it, expect, vi, afterEach } from 'vitest'
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

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

function setupDb() {
  const sqlite = new Database(':memory:')
  testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: './drizzle' })
}

describe('GET /api/config/proxy', () => {
  it('retorna globallyEnabled=true e timeoutMs=10000 por padrão', async () => {
    setupDb()
    const { buildApp } = await import('../../../src/app.js')
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/config/proxy' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.globallyEnabled).toBe(true)
    expect(body.timeoutMs).toBe(10000)

    await app.close()
  })

  it('retorna globallyEnabled=false quando PROXY_ENABLED=false', async () => {
    vi.stubEnv('PROXY_ENABLED', 'false')
    vi.resetModules()
    setupDb()
    const { buildApp } = await import('../../../src/app.js')
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/config/proxy' })

    expect(res.statusCode).toBe(200)
    expect(res.json().globallyEnabled).toBe(false)

    await app.close()
  })

  it('retorna timeoutMs customizado via PROXY_TIMEOUT_MS', async () => {
    vi.stubEnv('PROXY_TIMEOUT_MS', '3000')
    vi.resetModules()
    setupDb()
    const { buildApp } = await import('../../../src/app.js')
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/config/proxy' })

    expect(res.statusCode).toBe(200)
    expect(res.json().timeoutMs).toBe(3000)

    await app.close()
  })
})
