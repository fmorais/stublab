import { beforeEach, describe, it, expect, vi } from 'vitest'
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

const serviceModule = await import('../../src/services/endpoint-service.js')
const { EndpointService, EndpointServiceError } = serviceModule
type EndpointServiceErrorInstance = InstanceType<typeof EndpointServiceError>

// UUID do workspace "default" criado na migration
const DEFAULT_WS = '00000000-0000-0000-0000-000000000001'

beforeEach(() => {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: './drizzle' })
})

// Helper para criar um endpoint com valores padrão
async function createEndpoint(overrides?: Partial<Parameters<typeof EndpointService.create>[0]>) {
  return EndpointService.create({
    workspaceId: DEFAULT_WS,
    name: 'Test Endpoint',
    method: 'GET',
    path: '/test',
    responseStatus: 200,
    ...overrides,
  })
}

describe('EndpointService.create', () => {
  it('cria endpoint com dados válidos e retorna com id e timestamps', async () => {
    const result = await createEndpoint()

    expect(result.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.name).toBe('Test Endpoint')
    expect(result.method).toBe('GET')
    expect(result.path).toBe('/test')
    expect(result.active).toBe(true)
    expect(result.responseStatus).toBe(200)
    expect(result.responseBody).toBe('{}')
    expect(result.responseHeaders).toEqual({})
    expect(result.delay).toBe(0)
    expect(result.createdAt).toBeTruthy()
    expect(result.updatedAt).toBeTruthy()
  })

  it('cria endpoint com valores customizados', async () => {
    const result = await createEndpoint({
      name: 'Custom',
      method: 'POST',
      path: '/users',
      responseStatus: 201,
      responseBody: '{"id":1}',
      responseHeaders: { 'X-Custom': 'value' },
      delay: 500,
    })

    expect(result.responseBody).toBe('{"id":1}')
    expect(result.responseHeaders).toEqual({ 'X-Custom': 'value' })
    expect(result.delay).toBe(500)
  })

  it('lança EndpointServiceError CONFLICT ao criar method+path duplicado com ativo', async () => {
    await createEndpoint({ method: 'GET', path: '/users' })

    await expect(createEndpoint({ method: 'GET', path: '/users' })).rejects.toThrow(EndpointServiceError)

    try {
      await createEndpoint({ method: 'GET', path: '/users' })
    } catch (err) {
      expect(err).toBeInstanceOf(EndpointServiceError)
      expect((err as EndpointServiceErrorInstance).code).toBe('CONFLICT')
    }
  })

  it('permite criar endpoint com mesmo method+path se o existente está inativo', async () => {
    const existing = await createEndpoint({ method: 'GET', path: '/users' })
    await EndpointService.toggle(existing.id, DEFAULT_WS) // desativa

    const result = await createEndpoint({ method: 'GET', path: '/users' })
    expect(result.id).not.toBe(existing.id)
    expect(result.active).toBe(true)
  })

  it('permite mesmo method+path em workspaces diferentes (sem conflito)', async () => {
    // Cria um segundo workspace
    const wsModule = await import('../../src/services/workspace-service.js')
    const ws2 = await wsModule.WorkspaceService.create({ name: 'Outro', slug: 'outro' })

    await createEndpoint({ method: 'GET', path: '/shared' })
    const result = await createEndpoint({ workspaceId: ws2.id, method: 'GET', path: '/shared' })
    expect(result.id).toBeTruthy() // Sem conflito entre workspaces
  })
})

describe('EndpointService.findAll', () => {
  beforeEach(async () => {
    await createEndpoint({ name: 'Listar usuários', method: 'GET', path: '/users' })
    await createEndpoint({ name: 'Criar usuário', method: 'POST', path: '/users' })
    await createEndpoint({ name: 'Buscar produto', method: 'GET', path: '/products' })
  })

  it('retorna todos os endpoints quando sem filtros', async () => {
    const result = await EndpointService.findAll(DEFAULT_WS)
    expect(result.total).toBe(3)
    expect(result.data).toHaveLength(3)
  })

  it('filtra por search com match no name', async () => {
    const result = await EndpointService.findAll(DEFAULT_WS, { search: 'usuário' })
    expect(result.total).toBe(2)
    expect(result.data.every((e) => e.name.includes('usuário'))).toBe(true)
  })

  it('filtra por search com match no path', async () => {
    const result = await EndpointService.findAll(DEFAULT_WS, { search: '/products' })
    expect(result.total).toBe(1)
    expect(result.data[0].path).toBe('/products')
  })

  it('retorna vazio quando search não tem match', async () => {
    const result = await EndpointService.findAll(DEFAULT_WS, { search: 'naoexiste' })
    expect(result.total).toBe(0)
    expect(result.data).toHaveLength(0)
  })

  it('filtra por method', async () => {
    const result = await EndpointService.findAll(DEFAULT_WS, { method: 'POST' })
    expect(result.total).toBe(1)
    expect(result.data[0].method).toBe('POST')
  })

  it('filtra por active=true', async () => {
    const all = await EndpointService.findAll(DEFAULT_WS)
    await EndpointService.toggle(all.data[0].id, DEFAULT_WS) // desativa o primeiro

    const result = await EndpointService.findAll(DEFAULT_WS, { active: true })
    expect(result.total).toBe(2)
    expect(result.data.every((e) => e.active === true)).toBe(true)
  })

  it('filtra por active=false', async () => {
    const all = await EndpointService.findAll(DEFAULT_WS)
    await EndpointService.toggle(all.data[0].id, DEFAULT_WS) // desativa o primeiro

    const result = await EndpointService.findAll(DEFAULT_WS, { active: false })
    expect(result.total).toBe(1)
    expect(result.data[0].active).toBe(false)
  })

  it('filtra combinando search e method', async () => {
    const result = await EndpointService.findAll(DEFAULT_WS, { search: 'usuário', method: 'POST' })
    expect(result.total).toBe(1)
    expect(result.data[0].name).toBe('Criar usuário')
    expect(result.data[0].method).toBe('POST')
  })

  it('isola endpoints entre workspaces', async () => {
    const wsModule = await import('../../src/services/workspace-service.js')
    const ws2 = await wsModule.WorkspaceService.create({ name: 'Outro', slug: 'outro' })
    await createEndpoint({ workspaceId: ws2.id, name: 'Ep Outro WS', method: 'GET', path: '/outro' })

    const result = await EndpointService.findAll(DEFAULT_WS)
    expect(result.data.every((e) => !e.name.includes('Outro WS'))).toBe(true)
    expect(result.total).toBe(3) // Apenas os do workspace default
  })
})

describe('EndpointService.findById', () => {
  it('retorna o endpoint existente', async () => {
    const created = await createEndpoint()
    const found = await EndpointService.findById(created.id, DEFAULT_WS)

    expect(found).not.toBeNull()
    expect(found!.id).toBe(created.id)
    expect(found!.name).toBe(created.name)
  })

  it('retorna null para id inexistente', async () => {
    const result = await EndpointService.findById('00000000-0000-0000-0000-000000000000', DEFAULT_WS)
    expect(result).toBeNull()
  })

  it('retorna null para endpoint de outro workspace', async () => {
    const wsModule = await import('../../src/services/workspace-service.js')
    const ws2 = await wsModule.WorkspaceService.create({ name: 'Outro', slug: 'outro' })
    const ep = await createEndpoint({ workspaceId: ws2.id })

    const result = await EndpointService.findById(ep.id, DEFAULT_WS)
    expect(result).toBeNull()
  })
})

describe('EndpointService.update', () => {
  it('atualiza campos e updatedAt muda', async () => {
    const created = await createEndpoint()

    // Garante que o tempo avança minimamente
    await new Promise((r) => setTimeout(r, 5))

    const updated = await EndpointService.update(created.id, DEFAULT_WS, {
      name: 'Nome Atualizado',
      responseStatus: 404,
      delay: 1000,
    })

    expect(updated.name).toBe('Nome Atualizado')
    expect(updated.responseStatus).toBe(404)
    expect(updated.delay).toBe(1000)
    expect(updated.method).toBe(created.method)
    expect(updated.path).toBe(created.path)
    expect(updated.updatedAt >= created.updatedAt).toBe(true)
  })

  it('lança EndpointServiceError NOT_FOUND para id inexistente', async () => {
    await expect(
      EndpointService.update('00000000-0000-0000-0000-000000000000', DEFAULT_WS, { name: 'X' }),
    ).rejects.toThrow(EndpointServiceError)

    try {
      await EndpointService.update('00000000-0000-0000-0000-000000000000', DEFAULT_WS, { name: 'X' })
    } catch (err) {
      expect((err as EndpointServiceErrorInstance).code).toBe('NOT_FOUND')
    }
  })

  it('lança CONFLICT ao mudar method+path para combinação de outro endpoint ativo', async () => {
    await createEndpoint({ method: 'GET', path: '/existing' })
    const toUpdate = await createEndpoint({ method: 'POST', path: '/other' })

    await expect(
      EndpointService.update(toUpdate.id, DEFAULT_WS, { method: 'GET', path: '/existing' }),
    ).rejects.toThrow(EndpointServiceError)

    try {
      await EndpointService.update(toUpdate.id, DEFAULT_WS, { method: 'GET', path: '/existing' })
    } catch (err) {
      expect((err as EndpointServiceErrorInstance).code).toBe('CONFLICT')
    }
  })

  it('permite atualizar sem conflito quando method+path não muda', async () => {
    const created = await createEndpoint({ method: 'GET', path: '/same' })
    const updated = await EndpointService.update(created.id, DEFAULT_WS, { name: 'Novo Nome' })
    expect(updated.name).toBe('Novo Nome')
  })

  it('permite atualizar method+path para o mesmo valor do próprio endpoint', async () => {
    const created = await createEndpoint({ method: 'GET', path: '/mine' })
    const updated = await EndpointService.update(created.id, DEFAULT_WS, { method: 'GET', path: '/mine' })
    expect(updated.method).toBe('GET')
    expect(updated.path).toBe('/mine')
  })

  it('não verifica conflito ao mudar method+path em endpoint inativo', async () => {
    await createEndpoint({ method: 'GET', path: '/inativo-test' })

    const inactive = await createEndpoint({ method: 'POST', path: '/inactive-path' })
    await EndpointService.toggle(inactive.id, DEFAULT_WS)

    const updated = await EndpointService.update(inactive.id, DEFAULT_WS, {
      method: 'GET',
      path: '/inativo-test',
    })
    expect(updated.method).toBe('GET')
    expect(updated.path).toBe('/inativo-test')
    expect(updated.active).toBe(false)
  })

  it('lança NOT_FOUND ao tentar atualizar endpoint de outro workspace', async () => {
    const wsModule = await import('../../src/services/workspace-service.js')
    const ws2 = await wsModule.WorkspaceService.create({ name: 'Outro', slug: 'outro' })
    const ep = await createEndpoint({ workspaceId: ws2.id })

    await expect(
      EndpointService.update(ep.id, DEFAULT_WS, { name: 'X' }),
    ).rejects.toThrow(EndpointServiceError)
  })
})

describe('EndpointService.toggle', () => {
  it('desativa endpoint ativo', async () => {
    const created = await createEndpoint()
    expect(created.active).toBe(true)

    const result = await EndpointService.toggle(created.id, DEFAULT_WS)
    expect(result.id).toBe(created.id)
    expect(result.active).toBe(false)
    expect(result.updatedAt).toBeTruthy()
  })

  it('ativa endpoint inativo', async () => {
    const created = await createEndpoint()
    await EndpointService.toggle(created.id, DEFAULT_WS) // desativa

    const result = await EndpointService.toggle(created.id, DEFAULT_WS) // ativa novamente
    expect(result.active).toBe(true)
  })

  it('lança EndpointServiceError NOT_FOUND para id inexistente', async () => {
    await expect(EndpointService.toggle('00000000-0000-0000-0000-000000000000', DEFAULT_WS)).rejects.toThrow(
      EndpointServiceError,
    )

    try {
      await EndpointService.toggle('00000000-0000-0000-0000-000000000000', DEFAULT_WS)
    } catch (err) {
      expect((err as EndpointServiceErrorInstance).code).toBe('NOT_FOUND')
    }
  })

  it('lança CONFLICT ao ativar quando outro endpoint ativo tem mesmo method+path', async () => {
    const first = await createEndpoint({ method: 'DELETE', path: '/toggle-conflict' })
    await EndpointService.toggle(first.id, DEFAULT_WS) // desativa first

    await createEndpoint({ method: 'DELETE', path: '/toggle-conflict' })

    await expect(EndpointService.toggle(first.id, DEFAULT_WS)).rejects.toThrow(EndpointServiceError)

    try {
      await EndpointService.toggle(first.id, DEFAULT_WS)
    } catch (err) {
      expect((err as EndpointServiceErrorInstance).code).toBe('CONFLICT')
    }
  })
})

describe('EndpointService.delete', () => {
  it('retorna true para endpoint existente e remove do banco', async () => {
    const created = await createEndpoint()
    const result = await EndpointService.delete(created.id, DEFAULT_WS)

    expect(result).toBe(true)

    const found = await EndpointService.findById(created.id, DEFAULT_WS)
    expect(found).toBeNull()
  })

  it('retorna false para id inexistente', async () => {
    const result = await EndpointService.delete('00000000-0000-0000-0000-000000000000', DEFAULT_WS)
    expect(result).toBe(false)
  })

  it('retorna false para endpoint de outro workspace', async () => {
    const wsModule = await import('../../src/services/workspace-service.js')
    const ws2 = await wsModule.WorkspaceService.create({ name: 'Outro', slug: 'outro' })
    const ep = await createEndpoint({ workspaceId: ws2.id })

    const result = await EndpointService.delete(ep.id, DEFAULT_WS)
    expect(result).toBe(false)
  })
})

describe('EndpointService.create com matchingRules', () => {
  it('cria endpoint com regras e retorna matchingRules populado', async () => {
    const result = await EndpointService.create({
      workspaceId: DEFAULT_WS,
      name: 'Com Regras',
      method: 'POST',
      path: '/pagamentos',
      responseStatus: 200,
      matchingRules: [
        { source: 'body', field: 'tipo', operator: 'eq', value: 'PIX' },
        { source: 'header', field: 'x-tenant-id', operator: 'exists' },
      ],
    })

    expect(result.matchingRules).toHaveLength(2)
    expect(result.matchingRules[0].source).toBe('body')
    expect(result.matchingRules[0].field).toBe('tipo')
    expect(result.matchingRules[0].operator).toBe('eq')
    expect(result.matchingRules[0].value).toBe('PIX')
    expect(result.matchingRules[0].endpointId).toBe(result.id)
    expect(result.matchingRules[1].source).toBe('header')
    expect(result.matchingRules[1].operator).toBe('exists')
    expect(result.matchingRules[1].value).toBeNull()
  })

  it('cria endpoint sem matchingRules e retorna matchingRules: []', async () => {
    const result = await createEndpoint()
    expect(result.matchingRules).toEqual([])
  })

  it('cria endpoint com matchingRules vazio e retorna matchingRules: []', async () => {
    const result = await EndpointService.create({
      workspaceId: DEFAULT_WS,
      name: 'Sem Regras',
      method: 'DELETE',
      path: '/recursos',
      responseStatus: 204,
      matchingRules: [],
    })
    expect(result.matchingRules).toEqual([])
  })
})

describe('EndpointService.findById com matchingRules', () => {
  it('retorna matchingRules populado para endpoint com regras', async () => {
    const created = await EndpointService.create({
      workspaceId: DEFAULT_WS,
      name: 'Com Regras',
      method: 'POST',
      path: '/find-test',
      responseStatus: 200,
      matchingRules: [
        { source: 'query', field: 'status', operator: 'eq', value: 'active' },
      ],
    })

    const found = await EndpointService.findById(created.id, DEFAULT_WS)

    expect(found).not.toBeNull()
    expect(found!.matchingRules).toHaveLength(1)
    expect(found!.matchingRules[0].field).toBe('status')
    expect(found!.matchingRules[0].value).toBe('active')
    expect(found!.matchingRules[0].endpointId).toBe(created.id)
  })

  it('retorna matchingRules: [] para endpoint sem regras', async () => {
    const created = await createEndpoint()
    const found = await EndpointService.findById(created.id, DEFAULT_WS)

    expect(found).not.toBeNull()
    expect(found!.matchingRules).toEqual([])
  })
})

describe('EndpointService.findAll com matchingRules', () => {
  it('retorna matchingRules em cada endpoint da listagem', async () => {
    const ep1 = await EndpointService.create({
      workspaceId: DEFAULT_WS,
      name: 'Ep1',
      method: 'GET',
      path: '/list-test-1',
      responseStatus: 200,
      matchingRules: [
        { source: 'query', field: 'env', operator: 'eq', value: 'staging' },
      ],
    })
    await EndpointService.create({
      workspaceId: DEFAULT_WS,
      name: 'Ep2',
      method: 'POST',
      path: '/list-test-2',
      responseStatus: 201,
    })

    const result = await EndpointService.findAll(DEFAULT_WS)
    const found1 = result.data.find((e) => e.id === ep1.id)
    const found2 = result.data.find((e) => e.path === '/list-test-2')

    expect(found1).toBeDefined()
    expect(found1!.matchingRules).toHaveLength(1)
    expect(found1!.matchingRules[0].field).toBe('env')

    expect(found2).toBeDefined()
    expect(found2!.matchingRules).toEqual([])
  })
})

describe('EndpointService.update com matchingRules', () => {
  it('substitui regras existentes quando matchingRules é fornecido', async () => {
    const created = await EndpointService.create({
      workspaceId: DEFAULT_WS,
      name: 'Para Atualizar',
      method: 'PUT',
      path: '/update-rules',
      responseStatus: 200,
      matchingRules: [
        { source: 'body', field: 'antigo', operator: 'eq', value: 'x' },
      ],
    })

    const updated = await EndpointService.update(created.id, DEFAULT_WS, {
      matchingRules: [
        { source: 'header', field: 'novo', operator: 'exists' },
        { source: 'query', field: 'outro', operator: 'neq', value: 'z' },
      ],
    })

    expect(updated.matchingRules).toHaveLength(2)
    expect(updated.matchingRules.find((r) => r.field === 'antigo')).toBeUndefined()
    expect(updated.matchingRules.find((r) => r.field === 'novo')).toBeDefined()
    expect(updated.matchingRules.find((r) => r.field === 'outro')).toBeDefined()
  })

  it('remove todas as regras quando matchingRules: []', async () => {
    const created = await EndpointService.create({
      workspaceId: DEFAULT_WS,
      name: 'Para Limpar',
      method: 'PATCH',
      path: '/clear-rules',
      responseStatus: 200,
      matchingRules: [
        { source: 'body', field: 'campo', operator: 'eq', value: 'valor' },
      ],
    })

    const updated = await EndpointService.update(created.id, DEFAULT_WS, { matchingRules: [] })
    expect(updated.matchingRules).toEqual([])
  })

  it('mantém regras inalteradas quando matchingRules não é fornecido', async () => {
    const created = await EndpointService.create({
      workspaceId: DEFAULT_WS,
      name: 'Preservar Regras',
      method: 'DELETE',
      path: '/preserve-rules',
      responseStatus: 204,
      matchingRules: [
        { source: 'query', field: 'confirm', operator: 'eq', value: 'yes' },
      ],
    })

    const updated = await EndpointService.update(created.id, DEFAULT_WS, { name: 'Nome Atualizado' })

    expect(updated.name).toBe('Nome Atualizado')
    expect(updated.matchingRules).toHaveLength(1)
    expect(updated.matchingRules[0].field).toBe('confirm')
  })
})
