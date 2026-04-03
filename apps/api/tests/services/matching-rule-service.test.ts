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

const { MatchingRuleService } = await import('../../src/services/matching-rule-service.js')
const { EndpointService } = await import('../../src/services/endpoint-service.js')

beforeEach(() => {
  const sqlite = new Database(':memory:')
  testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: './drizzle' })
})

async function createEndpoint(path = '/test') {
  return EndpointService.create({
    name: 'Test Endpoint',
    method: 'GET',
    path,
    responseStatus: 200,
  })
}

describe('MatchingRuleService.createMany', () => {
  it('cria múltiplas regras e retorna com ids e endpointId', async () => {
    const endpoint = await createEndpoint()

    const rules = await MatchingRuleService.createMany(endpoint.id, [
      { source: 'query', field: 'status', operator: 'eq', value: 'active' },
      { source: 'header', field: 'x-tenant-id', operator: 'exists' },
    ])

    expect(rules).toHaveLength(2)
    expect(rules[0].id).toMatch(/^[0-9a-f-]{36}$/)
    expect(rules[0].endpointId).toBe(endpoint.id)
    expect(rules[0].source).toBe('query')
    expect(rules[0].field).toBe('status')
    expect(rules[0].operator).toBe('eq')
    expect(rules[0].value).toBe('active')
    expect(rules[0].createdAt).toBeTruthy()
    expect(rules[1].source).toBe('header')
    expect(rules[1].operator).toBe('exists')
    expect(rules[1].value).toBeNull()
  })

  it('persiste regras no banco de dados', async () => {
    const endpoint = await createEndpoint()

    await MatchingRuleService.createMany(endpoint.id, [
      { source: 'body', field: 'tipo', operator: 'eq', value: 'PIX' },
    ])

    const persisted = await MatchingRuleService.findByEndpointId(endpoint.id)
    expect(persisted).toHaveLength(1)
    expect(persisted[0].field).toBe('tipo')
    expect(persisted[0].value).toBe('PIX')
  })

  it('retorna array vazio sem inserir nada quando rules é []', async () => {
    const endpoint = await createEndpoint()

    const result = await MatchingRuleService.createMany(endpoint.id, [])
    expect(result).toEqual([])

    const persisted = await MatchingRuleService.findByEndpointId(endpoint.id)
    expect(persisted).toHaveLength(0)
  })

  it('normaliza value null/undefined para null', async () => {
    const endpoint = await createEndpoint()

    const rules = await MatchingRuleService.createMany(endpoint.id, [
      { source: 'body', field: 'campo', operator: 'exists' },
      { source: 'body', field: 'outro', operator: 'not_exists', value: null },
    ])

    expect(rules[0].value).toBeNull()
    expect(rules[1].value).toBeNull()
  })
})

describe('MatchingRuleService.deleteByEndpointId', () => {
  it('remove todas as regras do endpoint', async () => {
    const endpoint = await createEndpoint()

    await MatchingRuleService.createMany(endpoint.id, [
      { source: 'query', field: 'a', operator: 'eq', value: '1' },
      { source: 'query', field: 'b', operator: 'eq', value: '2' },
    ])

    await MatchingRuleService.deleteByEndpointId(endpoint.id)

    const remaining = await MatchingRuleService.findByEndpointId(endpoint.id)
    expect(remaining).toHaveLength(0)
  })

  it('não afeta regras de outro endpoint', async () => {
    const ep1 = await createEndpoint('/ep1')
    const ep2 = await createEndpoint('/ep2')

    await MatchingRuleService.createMany(ep1.id, [
      { source: 'query', field: 'x', operator: 'eq', value: '1' },
    ])
    await MatchingRuleService.createMany(ep2.id, [
      { source: 'query', field: 'y', operator: 'eq', value: '2' },
    ])

    await MatchingRuleService.deleteByEndpointId(ep1.id)

    const ep1Rules = await MatchingRuleService.findByEndpointId(ep1.id)
    const ep2Rules = await MatchingRuleService.findByEndpointId(ep2.id)

    expect(ep1Rules).toHaveLength(0)
    expect(ep2Rules).toHaveLength(1)
  })

  it('não lança erro quando endpointId não tem regras', async () => {
    const endpoint = await createEndpoint()
    await expect(MatchingRuleService.deleteByEndpointId(endpoint.id)).resolves.toBeUndefined()
  })
})

describe('MatchingRuleService.findByEndpointId', () => {
  it('retorna apenas as regras do endpoint correto', async () => {
    const ep1 = await createEndpoint('/ep1')
    const ep2 = await createEndpoint('/ep2')

    await MatchingRuleService.createMany(ep1.id, [
      { source: 'query', field: 'status', operator: 'eq', value: 'ok' },
    ])
    await MatchingRuleService.createMany(ep2.id, [
      { source: 'header', field: 'auth', operator: 'exists' },
      { source: 'body', field: 'tipo', operator: 'eq', value: 'PIX' },
    ])

    const ep1Rules = await MatchingRuleService.findByEndpointId(ep1.id)
    const ep2Rules = await MatchingRuleService.findByEndpointId(ep2.id)

    expect(ep1Rules).toHaveLength(1)
    expect(ep1Rules[0].endpointId).toBe(ep1.id)
    expect(ep2Rules).toHaveLength(2)
    expect(ep2Rules.every((r) => r.endpointId === ep2.id)).toBe(true)
  })

  it('retorna array vazio para endpoint sem regras', async () => {
    const endpoint = await createEndpoint()
    const rules = await MatchingRuleService.findByEndpointId(endpoint.id)
    expect(rules).toEqual([])
  })
})

describe('MatchingRuleService.findByEndpointIds', () => {
  it('retorna mapa agrupado corretamente por endpoint', async () => {
    const ep1 = await createEndpoint('/ep1')
    const ep2 = await createEndpoint('/ep2')
    const ep3 = await createEndpoint('/ep3')

    await MatchingRuleService.createMany(ep1.id, [
      { source: 'query', field: 'a', operator: 'eq', value: '1' },
    ])
    await MatchingRuleService.createMany(ep2.id, [
      { source: 'header', field: 'b', operator: 'exists' },
      { source: 'body', field: 'c', operator: 'neq', value: 'x' },
    ])
    // ep3 sem regras

    const map = await MatchingRuleService.findByEndpointIds([ep1.id, ep2.id, ep3.id])

    expect(map.get(ep1.id)).toHaveLength(1)
    expect(map.get(ep1.id)![0].field).toBe('a')
    expect(map.get(ep2.id)).toHaveLength(2)
    expect(map.get(ep3.id)).toBeUndefined()
  })

  it('retorna mapa vazio para array de ids vazio', async () => {
    const map = await MatchingRuleService.findByEndpointIds([])
    expect(map.size).toBe(0)
  })

  it('não inclui regras de endpoints fora do array de ids', async () => {
    const ep1 = await createEndpoint('/ep1')
    const ep2 = await createEndpoint('/ep2')

    await MatchingRuleService.createMany(ep1.id, [
      { source: 'query', field: 'a', operator: 'eq', value: '1' },
    ])
    await MatchingRuleService.createMany(ep2.id, [
      { source: 'query', field: 'b', operator: 'eq', value: '2' },
    ])

    const map = await MatchingRuleService.findByEndpointIds([ep1.id])

    expect(map.get(ep1.id)).toHaveLength(1)
    expect(map.has(ep2.id)).toBe(false)
  })
})
