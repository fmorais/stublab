import { beforeEach, describe, it, expect, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../../src/db/schema.js'

type TestDb = ReturnType<typeof drizzle<typeof schema>>

let testDb: TestDb

vi.mock('../../src/db/index.js', () => ({
  get db() {
    return testDb
  },
}))

const serviceModule = await import('../../src/services/endpoint-service.js')
const { EndpointService, EndpointServiceError } = serviceModule
type EndpointServiceErrorInstance = InstanceType<typeof EndpointServiceError>

beforeEach(() => {
  const sqlite = new Database(':memory:')
  testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: './drizzle' })
})

// Helper para criar um endpoint com valores padrão
async function createEndpoint(overrides?: Partial<Parameters<typeof EndpointService.create>[0]>) {
  return EndpointService.create({
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
    await EndpointService.toggle(existing.id) // desativa

    const result = await createEndpoint({ method: 'GET', path: '/users' })
    expect(result.id).not.toBe(existing.id)
    expect(result.active).toBe(true)
  })
})

describe('EndpointService.findAll', () => {
  beforeEach(async () => {
    await createEndpoint({ name: 'Listar usuários', method: 'GET', path: '/users' })
    await createEndpoint({ name: 'Criar usuário', method: 'POST', path: '/users' })
    await createEndpoint({ name: 'Buscar produto', method: 'GET', path: '/products' })
  })

  it('retorna todos os endpoints quando sem filtros', async () => {
    const result = await EndpointService.findAll()
    expect(result.total).toBe(3)
    expect(result.data).toHaveLength(3)
  })

  it('filtra por search com match no name', async () => {
    const result = await EndpointService.findAll({ search: 'usuário' })
    expect(result.total).toBe(2)
    expect(result.data.every((e) => e.name.includes('usuário'))).toBe(true)
  })

  it('filtra por search com match no path', async () => {
    const result = await EndpointService.findAll({ search: '/products' })
    expect(result.total).toBe(1)
    expect(result.data[0].path).toBe('/products')
  })

  it('retorna vazio quando search não tem match', async () => {
    const result = await EndpointService.findAll({ search: 'naoexiste' })
    expect(result.total).toBe(0)
    expect(result.data).toHaveLength(0)
  })

  it('filtra por method', async () => {
    const result = await EndpointService.findAll({ method: 'POST' })
    expect(result.total).toBe(1)
    expect(result.data[0].method).toBe('POST')
  })

  it('filtra por active=true', async () => {
    const all = await EndpointService.findAll()
    await EndpointService.toggle(all.data[0].id) // desativa o primeiro

    const result = await EndpointService.findAll({ active: true })
    expect(result.total).toBe(2)
    expect(result.data.every((e) => e.active === true)).toBe(true)
  })

  it('filtra por active=false', async () => {
    const all = await EndpointService.findAll()
    await EndpointService.toggle(all.data[0].id) // desativa o primeiro

    const result = await EndpointService.findAll({ active: false })
    expect(result.total).toBe(1)
    expect(result.data[0].active).toBe(false)
  })
})

describe('EndpointService.findById', () => {
  it('retorna o endpoint existente', async () => {
    const created = await createEndpoint()
    const found = await EndpointService.findById(created.id)

    expect(found).not.toBeNull()
    expect(found!.id).toBe(created.id)
    expect(found!.name).toBe(created.name)
  })

  it('retorna null para id inexistente', async () => {
    const result = await EndpointService.findById('00000000-0000-0000-0000-000000000000')
    expect(result).toBeNull()
  })
})

describe('EndpointService.update', () => {
  it('atualiza campos e updatedAt muda', async () => {
    const created = await createEndpoint()

    // Garante que o tempo avança minimamente
    await new Promise((r) => setTimeout(r, 5))

    const updated = await EndpointService.update(created.id, {
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
      EndpointService.update('00000000-0000-0000-0000-000000000000', { name: 'X' }),
    ).rejects.toThrow(EndpointServiceError)

    try {
      await EndpointService.update('00000000-0000-0000-0000-000000000000', { name: 'X' })
    } catch (err) {
      expect((err as EndpointServiceErrorInstance).code).toBe('NOT_FOUND')
    }
  })

  it('lança CONFLICT ao mudar method+path para combinação de outro endpoint ativo', async () => {
    await createEndpoint({ method: 'GET', path: '/existing' })
    const toUpdate = await createEndpoint({ method: 'POST', path: '/other' })

    await expect(
      EndpointService.update(toUpdate.id, { method: 'GET', path: '/existing' }),
    ).rejects.toThrow(EndpointServiceError)

    try {
      await EndpointService.update(toUpdate.id, { method: 'GET', path: '/existing' })
    } catch (err) {
      expect((err as EndpointServiceErrorInstance).code).toBe('CONFLICT')
    }
  })

  it('permite atualizar sem conflito quando method+path não muda', async () => {
    const created = await createEndpoint({ method: 'GET', path: '/same' })
    const updated = await EndpointService.update(created.id, { name: 'Novo Nome' })
    expect(updated.name).toBe('Novo Nome')
  })

  it('permite atualizar method+path para o mesmo valor do próprio endpoint', async () => {
    const created = await createEndpoint({ method: 'GET', path: '/mine' })
    const updated = await EndpointService.update(created.id, { method: 'GET', path: '/mine' })
    expect(updated.method).toBe('GET')
    expect(updated.path).toBe('/mine')
  })
})

describe('EndpointService.toggle', () => {
  it('desativa endpoint ativo', async () => {
    const created = await createEndpoint()
    expect(created.active).toBe(true)

    const result = await EndpointService.toggle(created.id)
    expect(result.id).toBe(created.id)
    expect(result.active).toBe(false)
    expect(result.updatedAt).toBeTruthy()
  })

  it('ativa endpoint inativo', async () => {
    const created = await createEndpoint()
    await EndpointService.toggle(created.id) // desativa

    const result = await EndpointService.toggle(created.id) // ativa novamente
    expect(result.active).toBe(true)
  })

  it('lança EndpointServiceError NOT_FOUND para id inexistente', async () => {
    await expect(EndpointService.toggle('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      EndpointServiceError,
    )

    try {
      await EndpointService.toggle('00000000-0000-0000-0000-000000000000')
    } catch (err) {
      expect((err as EndpointServiceErrorInstance).code).toBe('NOT_FOUND')
    }
  })

  it('lança CONFLICT ao ativar quando outro endpoint ativo tem mesmo method+path', async () => {
    // Cria o primeiro (ativo)
    await createEndpoint({ method: 'GET', path: '/conflict' })

    // Cria segundo inativo com mesmo method+path: primeiro cria, depois desativa
    const second = await createEndpoint({ name: 'Segundo', method: 'POST', path: '/conflict-other' })
    await EndpointService.toggle(second.id) // desativa o segundo

    // Agora cria um terceiro com o mesmo method+path do primeiro mas inativo
    // Para isso: cria com path diferente, desativa, depois tenta ativar forçando conflito
    // Abordagem direta: criar endpoint ativo, desativar o primeiro, criar segundo ativo, tentar ativar o primeiro
    const first = await createEndpoint({ method: 'DELETE', path: '/toggle-conflict' })
    await EndpointService.toggle(first.id) // desativa first

    const other = await createEndpoint({ method: 'DELETE', path: '/toggle-conflict' })
    expect(other.active).toBe(true)

    // Tentar ativar o first deve dar CONFLICT
    await expect(EndpointService.toggle(first.id)).rejects.toThrow(EndpointServiceError)

    try {
      await EndpointService.toggle(first.id)
    } catch (err) {
      expect((err as EndpointServiceErrorInstance).code).toBe('CONFLICT')
    }
  })
})

describe('EndpointService.delete', () => {
  it('retorna true para endpoint existente e remove do banco', async () => {
    const created = await createEndpoint()
    const result = await EndpointService.delete(created.id)

    expect(result).toBe(true)

    const found = await EndpointService.findById(created.id)
    expect(found).toBeNull()
  })

  it('retorna false para id inexistente', async () => {
    const result = await EndpointService.delete('00000000-0000-0000-0000-000000000000')
    expect(result).toBe(false)
  })
})
