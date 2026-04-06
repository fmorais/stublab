import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as schema from '../../../src/db/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '../../fixtures')

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

afterEach(() => {
  vi.restoreAllMocks()
})

function loadJsonFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'))
}

async function createWorkspace(app: Awaited<ReturnType<typeof buildApp>>) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/workspaces',
    payload: { name: 'Default', slug: 'default' },
  })
  return res.json()
}

describe('POST /api/workspaces/:slug/endpoints/import/preview — source=postman', () => {
  it('processa collection Postman simples e retorna preview', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const data = loadJsonFixture('postman-simple.json')

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/preview',
      payload: { source: 'postman', data },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.valid).toBe(true)
    expect(body.totalInFile).toBe(5)
    expect(body.summary.new).toBe(5)
    expect(body.summary.conflict).toBe(0)
    expect(body.summary.invalid).toBe(0)
    expect(Array.isArray(body.endpoints)).toBe(true)
    expect(body.endpoints).toHaveLength(5)

    await app.close()
  })

  it('retorna 400 com PARSE_ERROR para collection Postman inválida (v1)', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const data = {
      info: { schema: 'https://schema.getpostman.com/json/collection/v1.0.0/collection.json' },
      item: [],
    }

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/preview',
      payload: { source: 'postman', data },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('PARSE_ERROR')

    await app.close()
  })

  it('detecta conflitos para endpoints já existentes', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    // Criar endpoint que vai conflitar com /users GET da collection
    await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: { name: 'Existente', method: 'GET', path: '/users', responseStatus: 200 },
    })

    const data = loadJsonFixture('postman-simple.json')
    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/preview',
      payload: { source: 'postman', data },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.summary.conflict).toBe(1)
    expect(body.summary.new).toBe(4)

    await app.close()
  })
})

describe('POST /api/workspaces/:slug/endpoints/import/preview — source=openapi', () => {
  it('processa spec OpenAPI 3.0 e retorna preview', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const data = loadJsonFixture('openapi-3.0.json')

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/preview',
      payload: { source: 'openapi', data },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.valid).toBe(true)
    expect(body.totalInFile).toBeGreaterThan(0)
    expect(Array.isArray(body.endpoints)).toBe(true)

    await app.close()
  })

  it('retorna 400 com PARSE_ERROR para spec OpenAPI inválida', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const data = { openapi: '99.0.0', info: { title: 'Invalid', version: '1.0' }, paths: {} }

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/preview',
      payload: { source: 'openapi', data },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('PARSE_ERROR')

    await app.close()
  })
})

describe('POST /api/workspaces/:slug/endpoints/import/preview — retrocompatibilidade', () => {
  it('body sem source ainda funciona com formato antigo', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const data = {
      version: '1',
      exportedAt: new Date().toISOString(),
      exportedBy: 'StubLab',
      count: 1,
      endpoints: [
        {
          name: 'Endpoint legado',
          method: 'GET',
          path: '/legado',
          active: true,
          responseStatus: 200,
          responseBody: '{}',
          responseHeaders: {},
          delay: 0,
          matchingRules: [],
        },
      ],
    }

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/preview',
      payload: { data },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.valid).toBe(true)
    expect(body.summary.new).toBe(1)

    await app.close()
  })
})

describe('POST /api/workspaces/:slug/endpoints/import/from-url', () => {
  it('retorna 400 com INVALID_URL para URL inválida', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/from-url',
      payload: { url: 'não-é-uma-url' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('INVALID_URL')

    await app.close()
  })

  it('retorna 400 com INVALID_URL quando url está ausente', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/from-url',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('INVALID_URL')

    await app.close()
  })

  it('retorna 400 com FETCH_FAILED quando fetch falha com erro de conexão', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'))

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/from-url',
      payload: { url: 'http://localhost:9999/nonexistent' },
    })

    global.fetch = originalFetch

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('FETCH_FAILED')

    await app.close()
  })

  it('retorna 400 com FETCH_FAILED quando fetch retorna status não-ok', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/from-url',
      payload: { url: 'http://example.com/openapi.json' },
    })

    global.fetch = originalFetch

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('FETCH_FAILED')

    await app.close()
  })

  it('retorna 400 com INVALID_CONTENT para conteúdo sem versão OpenAPI', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: 'Not an OpenAPI spec' }), { status: 200 }),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/from-url',
      payload: { url: 'http://example.com/data.json' },
    })

    global.fetch = originalFetch

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('INVALID_CONTENT')

    await app.close()
  })

  it('retorna 200 com source e detectedVersion para spec OpenAPI válida em JSON', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const spec = JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    })

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValue(
      new Response(spec, { status: 200 }),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/from-url',
      payload: { url: 'http://example.com/openapi.json' },
    })

    global.fetch = originalFetch

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.source).toBe('openapi')
    expect(body.detectedVersion).toBe('3.0.3')
    expect(body.data).toBeDefined()

    await app.close()
  })

  it('retorna 200 para spec OpenAPI em YAML', async () => {
    const app = await buildApp()
    await app.ready()
    await createWorkspace(app)

    const yamlSpec = `openapi: "3.0.3"\ninfo:\n  title: Test\n  version: "1.0.0"\npaths: {}`

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValue(
      new Response(yamlSpec, { status: 200 }),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints/import/from-url',
      payload: { url: 'http://example.com/openapi.yaml' },
    })

    global.fetch = originalFetch

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.source).toBe('openapi')
    expect(body.detectedVersion).toBe('3.0.3')

    await app.close()
  })
})
