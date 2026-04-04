import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../../src/db/schema.js'

let testDb: BetterSQLite3Database<typeof schema>

vi.mock('../../src/db/index.js', () => ({
  get db() {
    return testDb
  },
}))

const { buildApp } = await import('../../src/app.js')

beforeEach(() => {
  const sqlite = new Database(':memory:')
  testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: './drizzle' })
})

// ---------------------------------------------------------------------------
// Fluxo 1 — CRUD completo sequencial
// ---------------------------------------------------------------------------

describe('Fluxo 1 — CRUD completo', () => {
  it('executa o ciclo completo: criar → listar → buscar → atualizar → toggle × 2 → deletar → 404', async () => {
    const app = await buildApp()
    await app.ready()

    // Passo 1: POST /api/endpoints → 201
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: {
        name: 'Listar usuários',
        method: 'GET',
        path: '/users',
        responseStatus: 200,
        responseBody: '{"users":[]}',
      },
    })
    expect(createRes.statusCode).toBe(201)
    const created = createRes.json()
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(created.active).toBe(true)

    const id = created.id

    // Passo 2: GET /api/endpoints → aparece na lista (total=1)
    const listRes = await app.inject({ method: 'GET', url: '/api/workspaces/default/endpoints' })
    expect(listRes.statusCode).toBe(200)
    const listBody = listRes.json()
    expect(listBody.total).toBe(1)
    expect(listBody.data[0].id).toBe(id)

    // Passo 3: GET /api/endpoints/:id → retorna o endpoint criado
    const getRes = await app.inject({ method: 'GET', url: `/api/workspaces/default/endpoints/${id}` })
    expect(getRes.statusCode).toBe(200)
    const getBody = getRes.json()
    expect(getBody.id).toBe(id)
    expect(getBody.name).toBe('Listar usuários')
    expect(getBody.responseStatus).toBe(200)

    // Passo 4: PUT /api/endpoints/:id → atualiza name e responseStatus
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/workspaces/default/endpoints/${id}`,
      payload: { name: 'Usuários atualizados', responseStatus: 202 },
    })
    expect(updateRes.statusCode).toBe(200)
    const updated = updateRes.json()
    expect(updated.name).toBe('Usuários atualizados')
    expect(updated.responseStatus).toBe(202)

    // Passo 5: GET /api/endpoints/:id → reflete as mudanças
    const getAfterUpdateRes = await app.inject({ method: 'GET', url: `/api/workspaces/default/endpoints/${id}` })
    expect(getAfterUpdateRes.statusCode).toBe(200)
    const getAfterUpdate = getAfterUpdateRes.json()
    expect(getAfterUpdate.name).toBe('Usuários atualizados')
    expect(getAfterUpdate.responseStatus).toBe(202)

    // Passo 6: PATCH toggle → desativa (active=false)
    const toggleOffRes = await app.inject({
      method: 'PATCH',
      url: `/api/workspaces/default/endpoints/${id}/toggle`,
    })
    expect(toggleOffRes.statusCode).toBe(200)
    expect(toggleOffRes.json().active).toBe(false)

    // Passo 7: GET /api/endpoints/:id → active=false
    const getInactiveRes = await app.inject({ method: 'GET', url: `/api/workspaces/default/endpoints/${id}` })
    expect(getInactiveRes.statusCode).toBe(200)
    expect(getInactiveRes.json().active).toBe(false)

    // Passo 8: PATCH toggle → reativa (active=true)
    const toggleOnRes = await app.inject({
      method: 'PATCH',
      url: `/api/workspaces/default/endpoints/${id}/toggle`,
    })
    expect(toggleOnRes.statusCode).toBe(200)
    expect(toggleOnRes.json().active).toBe(true)

    // Passo 9: DELETE /api/endpoints/:id → 204
    const deleteRes = await app.inject({ method: 'DELETE', url: `/api/workspaces/default/endpoints/${id}` })
    expect(deleteRes.statusCode).toBe(204)
    expect(deleteRes.body).toBe('')

    // Passo 10: GET /api/endpoints/:id → 404
    const getDeletedRes = await app.inject({ method: 'GET', url: `/api/workspaces/default/endpoints/${id}` })
    expect(getDeletedRes.statusCode).toBe(404)
    expect(getDeletedRes.json().code).toBe('NOT_FOUND')

    await app.close()
  })
})

// ---------------------------------------------------------------------------
// Fluxo 2 — Mock engine integrado com toggle e delete
// ---------------------------------------------------------------------------

describe('Fluxo 2 — Mock engine integrado', () => {
  it('executa o ciclo: criar → mock responde → toggle off → mock 404 → toggle on → mock responde → deletar → mock 404', async () => {
    const app = await buildApp()
    await app.ready()

    // Passo 1: criar endpoint ativo GET /users com status 200
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: {
        name: 'Mock users',
        method: 'GET',
        path: '/users',
        responseStatus: 200,
        responseBody: '{"users":[]}',
      },
    })
    expect(createRes.statusCode).toBe(201)
    const id = createRes.json().id

    // Passo 2: GET /mock/users → responde 200 com body correto
    const mockRes1 = await app.inject({ method: 'GET', url: '/mock/default/users' })
    expect(mockRes1.statusCode).toBe(200)
    expect(mockRes1.body).toBe('{"users":[]}')

    // Passo 3: PATCH toggle → desativa endpoint
    const toggleOffRes = await app.inject({
      method: 'PATCH',
      url: `/api/workspaces/default/endpoints/${id}/toggle`,
    })
    expect(toggleOffRes.statusCode).toBe(200)
    expect(toggleOffRes.json().active).toBe(false)

    // Passo 4: GET /mock/users → 404 MOCK_NOT_FOUND
    const mockRes2 = await app.inject({ method: 'GET', url: '/mock/default/users' })
    expect(mockRes2.statusCode).toBe(404)
    expect(mockRes2.json().code).toBe('MOCK_NOT_FOUND')

    // Passo 5: PATCH toggle → reativa
    const toggleOnRes = await app.inject({
      method: 'PATCH',
      url: `/api/workspaces/default/endpoints/${id}/toggle`,
    })
    expect(toggleOnRes.statusCode).toBe(200)
    expect(toggleOnRes.json().active).toBe(true)

    // Passo 6: GET /mock/users → responde 200 novamente
    const mockRes3 = await app.inject({ method: 'GET', url: '/mock/default/users' })
    expect(mockRes3.statusCode).toBe(200)
    expect(mockRes3.body).toBe('{"users":[]}')

    // Passo 7: DELETE endpoint
    const deleteRes = await app.inject({ method: 'DELETE', url: `/api/workspaces/default/endpoints/${id}` })
    expect(deleteRes.statusCode).toBe(204)

    // Passo 8: GET /mock/users → 404 MOCK_NOT_FOUND (endpoint deletado)
    const mockRes4 = await app.inject({ method: 'GET', url: '/mock/default/users' })
    expect(mockRes4.statusCode).toBe(404)
    expect(mockRes4.json().code).toBe('MOCK_NOT_FOUND')

    await app.close()
  })
})

// ---------------------------------------------------------------------------
// Fluxo 3 — Regras de negócio: conflito de method+path entre ativos/inativos
// ---------------------------------------------------------------------------

describe('Fluxo 3 — Regras de negócio com conflito de method+path', () => {
  it('segundo endpoint com mesmo method+path retorna 409 se primeiro está ativo', async () => {
    const app = await buildApp()
    await app.ready()

    // Passo 1: criar primeiro endpoint ativo GET /conflict
    const first = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: { name: 'Primeiro', method: 'GET', path: '/conflict', responseStatus: 200 },
    })
    expect(first.statusCode).toBe(201)
    const firstId = first.json().id

    // Tentar criar segundo com mesmo method+path → 409
    const second = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: { name: 'Segundo', method: 'GET', path: '/conflict', responseStatus: 200 },
    })
    expect(second.statusCode).toBe(409)
    expect(second.json().code).toBe('CONFLICT')

    // Passo 2: desativar o primeiro → criar o segundo → sucesso
    await app.inject({ method: 'PATCH', url: `/api/workspaces/default/endpoints/${firstId}/toggle` })

    const secondOk = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: { name: 'Segundo', method: 'GET', path: '/conflict', responseStatus: 201 },
    })
    expect(secondOk.statusCode).toBe(201)
    const secondId = secondOk.json().id
    expect(secondOk.json().active).toBe(true)

    // Passo 3: tentar reativar o primeiro → 409 (conflito com o segundo ativo)
    const reactivateFirst = await app.inject({
      method: 'PATCH',
      url: `/api/workspaces/default/endpoints/${firstId}/toggle`,
    })
    expect(reactivateFirst.statusCode).toBe(409)
    expect(reactivateFirst.json().code).toBe('CONFLICT')

    // Verificar estado final: primeiro ainda inativo, segundo ainda ativo
    const getFirst = await app.inject({ method: 'GET', url: `/api/workspaces/default/endpoints/${firstId}` })
    expect(getFirst.json().active).toBe(false)

    const getSecond = await app.inject({ method: 'GET', url: `/api/workspaces/default/endpoints/${secondId}` })
    expect(getSecond.json().active).toBe(true)

    await app.close()
  })

  it('dois endpoints inativos podem ter o mesmo method+path', async () => {
    const app = await buildApp()
    await app.ready()

    // Cria primeiro, desativa
    const first = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: { name: 'Primeiro', method: 'POST', path: '/shared', responseStatus: 201 },
    })
    const firstId = first.json().id
    await app.inject({ method: 'PATCH', url: `/api/workspaces/default/endpoints/${firstId}/toggle` })

    // Cria segundo com mesmo method+path, desativa
    const second = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: { name: 'Segundo', method: 'POST', path: '/shared', responseStatus: 201 },
    })
    expect(second.statusCode).toBe(201)
    const secondId = second.json().id
    await app.inject({ method: 'PATCH', url: `/api/workspaces/default/endpoints/${secondId}/toggle` })

    // Ambos inativos — GET lista mostra 2 com active=false
    const listRes = await app.inject({ method: 'GET', url: '/api/workspaces/default/endpoints?active=false' })
    expect(listRes.statusCode).toBe(200)
    const listBody = listRes.json()
    expect(listBody.total).toBe(2)
    expect(listBody.data.every((e: { active: boolean }) => e.active === false)).toBe(true)

    await app.close()
  })
})

// ---------------------------------------------------------------------------
// Fluxo 4 — Mock com delay
// ---------------------------------------------------------------------------

describe('Fluxo 4 — Mock com delay', () => {
  it('endpoint com delay=100ms faz a resposta demorar pelo menos 100ms', async () => {
    const app = await buildApp()
    await app.ready()

    // Passo 1: criar endpoint com delay=100ms
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: {
        name: 'Com delay',
        method: 'GET',
        path: '/slow',
        responseStatus: 200,
        responseBody: '{"slow":true}',
        delay: 100,
      },
    })
    expect(createRes.statusCode).toBe(201)
    expect(createRes.json().delay).toBe(100)

    // Passo 2: medir tempo da resposta de /mock/slow → >= 100ms
    const start = Date.now()
    const mockRes = await app.inject({ method: 'GET', url: '/mock/default/slow' })
    const elapsed = Date.now() - start

    expect(mockRes.statusCode).toBe(200)
    expect(mockRes.body).toBe('{"slow":true}')
    expect(elapsed).toBeGreaterThanOrEqual(90) // margem de 10ms para CI

    await app.close()
  })

  it('endpoint com delay=0ms não introduz espera adicional significativa', async () => {
    const app = await buildApp()
    await app.ready()

    await app.inject({
      method: 'POST',
      url: '/api/workspaces/default/endpoints',
      payload: {
        name: 'Sem delay',
        method: 'GET',
        path: '/fast',
        responseStatus: 200,
        responseBody: '{"fast":true}',
        delay: 0,
      },
    })

    const start = Date.now()
    const mockRes = await app.inject({ method: 'GET', url: '/mock/default/fast' })
    const elapsed = Date.now() - start

    expect(mockRes.statusCode).toBe(200)
    // Sem delay não deve demorar mais de 500ms (limite bem conservador)
    expect(elapsed).toBeLessThan(500)

    await app.close()
  })
})
