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

async function createEndpoint(
  app: Awaited<ReturnType<typeof buildApp>>,
  overrides: Record<string, unknown> = {},
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/endpoints',
    payload: {
      name: 'Test endpoint',
      method: 'GET',
      path: '/test',
      responseStatus: 200,
      ...overrides,
    },
  })
  return res.json()
}

function buildExportFile(endpoints: Record<string, unknown>[]) {
  return {
    version: '1',
    exportedAt: new Date().toISOString(),
    exportedBy: 'StubLab',
    count: endpoints.length,
    endpoints,
  }
}

function buildValidEndpoint(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Imported endpoint',
    method: 'GET',
    path: '/imported',
    active: true,
    responseStatus: 200,
    responseBody: '{}',
    responseHeaders: {},
    delay: 0,
    matchingRules: [],
    ...overrides,
  }
}

describe('POST /api/endpoints/import/preview', () => {
  it('retorna preview de arquivo válido sem conflitos com summary new=2', async () => {
    const app = await buildApp()
    await app.ready()

    const data = buildExportFile([
      buildValidEndpoint({ name: 'Endpoint novo 1', path: '/novo-1', method: 'GET' }),
      buildValidEndpoint({ name: 'Endpoint novo 2', path: '/novo-2', method: 'POST' }),
    ])

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints/import/preview',
      payload: { data },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.valid).toBe(true)
    expect(body.version).toBe('1')
    expect(body.totalInFile).toBe(2)
    expect(body.preview).toHaveLength(2)
    expect(body.summary.new).toBe(2)
    expect(body.summary.conflict).toBe(0)
    expect(body.summary.invalid).toBe(0)
    for (const item of body.preview) {
      expect(item.status).toBe('new')
    }

    await app.close()
  })

  it('retorna summary com conflict=1 quando existe endpoint com mesmo method+path', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { name: 'Existente', method: 'GET', path: '/existente' })

    const data = buildExportFile([
      buildValidEndpoint({ name: 'Conflito', method: 'GET', path: '/existente' }),
    ])

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints/import/preview',
      payload: { data },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.summary.conflict).toBe(1)
    expect(body.summary.new).toBe(0)
    expect(body.summary.invalid).toBe(0)
    expect(body.preview[0].status).toBe('conflict')
    expect(body.preview[0].existingId).toBeTruthy()

    await app.close()
  })

  it('retorna summary com invalid=1 e valid=false quando endpoint não tem name', async () => {
    const app = await buildApp()
    await app.ready()

    const invalidEndpoint = buildValidEndpoint({ name: '', path: '/invalido' })
    const data = buildExportFile([invalidEndpoint])

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints/import/preview',
      payload: { data },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.valid).toBe(false)
    expect(body.summary.invalid).toBe(1)
    expect(body.summary.new).toBe(0)
    expect(body.preview[0].status).toBe('invalid')
    expect(body.preview[0].errors).toHaveLength(1)

    await app.close()
  })

  it('retorna 400 com code INVALID_FORMAT quando body não tem campo data', async () => {
    const app = await buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints/import/preview',
      payload: { endpoints: [] },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.code).toBe('INVALID_FORMAT')

    await app.close()
  })
})

describe('POST /api/endpoints/import — estratégia skip', () => {
  it('cria novos endpoints e ignora os que já existem', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { name: 'Existente', method: 'GET', path: '/skip-existente' })

    const data = buildExportFile([
      buildValidEndpoint({ name: 'Existente', method: 'GET', path: '/skip-existente' }),
      buildValidEndpoint({ name: 'Novo', method: 'POST', path: '/skip-novo' }),
    ])

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints/import',
      payload: { data, strategy: 'skip' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.created).toBe(1)
    expect(body.skipped).toBe(1)
    expect(body.updated).toBe(0)
    expect(body.errors).toEqual([])

    await app.close()
  })
})

describe('POST /api/endpoints/import — estratégia overwrite', () => {
  it('atualiza endpoints existentes com os dados do arquivo', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, {
      name: 'Antigo',
      method: 'GET',
      path: '/overwrite-path',
    })

    const data = buildExportFile([
      buildValidEndpoint({ name: 'Novo', method: 'GET', path: '/overwrite-path' }),
    ])

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints/import',
      payload: { data, strategy: 'overwrite' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.updated).toBe(1)
    expect(body.created).toBe(0)
    expect(body.skipped).toBe(0)
    expect(body.errors).toEqual([])

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/endpoints',
    })
    const listBody = listRes.json()
    const updated = listBody.data.find(
      (ep: { method: string; path: string }) =>
        ep.method === 'GET' && ep.path === '/overwrite-path',
    )
    expect(updated).toBeDefined()
    expect(updated.name).toBe('Novo')

    await app.close()
  })
})

describe('POST /api/endpoints/import — estratégia duplicate', () => {
  it('cria novo endpoint mesmo quando já existe um com mesmo method+path', async () => {
    const app = await buildApp()
    await app.ready()

    await createEndpoint(app, { name: 'Original', method: 'GET', path: '/duplicate-path' })

    const data = buildExportFile([
      buildValidEndpoint({ name: 'Duplicado', method: 'GET', path: '/duplicate-path' }),
    ])

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints/import',
      payload: { data, strategy: 'duplicate' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.created).toBe(1)
    expect(body.updated).toBe(0)
    expect(body.skipped).toBe(0)
    expect(body.errors).toEqual([])

    const listRes = await app.inject({ method: 'GET', url: '/api/endpoints' })
    const listBody = listRes.json()
    const duplicates = listBody.data.filter(
      (ep: { method: string; path: string }) =>
        ep.method === 'GET' && ep.path === '/duplicate-path',
    )
    expect(duplicates).toHaveLength(2)

    await app.close()
  })
})

describe('POST /api/endpoints/import — validação', () => {
  it('retorna 400 com code INVALID_FORMAT quando body não tem campo strategy', async () => {
    const app = await buildApp()
    await app.ready()

    const data = buildExportFile([buildValidEndpoint()])

    const res = await app.inject({
      method: 'POST',
      url: '/api/endpoints/import',
      payload: { data },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.code).toBe('INVALID_FORMAT')

    await app.close()
  })
})
