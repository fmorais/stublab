import { describe, it, expect } from 'vitest'
import { matchEndpoint } from '../../src/mock/engine.js'
import type { Endpoint, MatchingRule } from '../../src/types/endpoint.js'

function makeEndpoint(overrides: Partial<Endpoint> & Pick<Endpoint, 'method' | 'path'>): Endpoint {
  return {
    id: 'test-id',
    name: 'Test',
    active: true,
    responseStatus: 200,
    responseBody: '{}',
    responseHeaders: {},
    delay: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    matchingRules: [],
    ...overrides,
  }
}

function makeRule(overrides: Partial<MatchingRule> & Pick<MatchingRule, 'source' | 'field' | 'operator'>): MatchingRule {
  return {
    id: 'rule-id',
    endpointId: 'test-id',
    value: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const noQuery: Record<string, string> = {}
const noHeaders: Record<string, string> = {}
const noBody = null

describe('matchEndpoint', () => {
  it('retorna null para lista vazia de endpoints', () => {
    expect(matchEndpoint('GET', '/users', noQuery, noHeaders, noBody, [])).toBeNull()
  })

  it('faz match exato em path estático', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users' })
    expect(matchEndpoint('GET', '/users', noQuery, noHeaders, noBody, [endpoint])).toBe(endpoint)
  })

  it('faz match com um parâmetro dinâmico', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users/:id' })
    expect(matchEndpoint('GET', '/users/123', noQuery, noHeaders, noBody, [endpoint])).toBe(endpoint)
  })

  it('faz match com múltiplos parâmetros dinâmicos', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/orgs/:org/repos/:repo' })
    expect(matchEndpoint('GET', '/orgs/acme/repos/api', noQuery, noHeaders, noBody, [endpoint])).toBe(endpoint)
  })

  it('não faz match quando o método é diferente', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users' })
    expect(matchEndpoint('POST', '/users', noQuery, noHeaders, noBody, [endpoint])).toBeNull()
  })

  it('não faz match quando o path não existe', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users' })
    expect(matchEndpoint('GET', '/products', noQuery, noHeaders, noBody, [endpoint])).toBeNull()
  })

  it('não faz match quando path com param não bate em path mais curto', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users/:id' })
    expect(matchEndpoint('GET', '/users', noQuery, noHeaders, noBody, [endpoint])).toBeNull()
  })

  it('não faz match quando path tem segmentos extras além do param', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users/:id' })
    expect(matchEndpoint('GET', '/users/123/posts', noQuery, noHeaders, noBody, [endpoint])).toBeNull()
  })

  it('path estático tem prioridade sobre path com parâmetro', () => {
    const staticEndpoint = makeEndpoint({ method: 'GET', path: '/users/me', id: 'static' })
    const dynamicEndpoint = makeEndpoint({ method: 'GET', path: '/users/:id', id: 'dynamic' })
    const result = matchEndpoint('GET', '/users/me', noQuery, noHeaders, noBody, [dynamicEndpoint, staticEndpoint])
    expect(result).toBe(staticEndpoint)
  })

  it('matching é case-insensitive no método HTTP', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users' })
    expect(matchEndpoint('get', '/users', noQuery, noHeaders, noBody, [endpoint])).toBe(endpoint)
  })

  it('não faz match em path completamente diferente', () => {
    const endpointList = [
      makeEndpoint({ method: 'GET', path: '/users' }),
      makeEndpoint({ method: 'POST', path: '/users' }),
    ]
    expect(matchEndpoint('DELETE', '/users', noQuery, noHeaders, noBody, endpointList)).toBeNull()
  })

  it('seleciona o endpoint correto entre vários', () => {
    const getUsers = makeEndpoint({ method: 'GET', path: '/users', id: 'get-users' })
    const getUser = makeEndpoint({ method: 'GET', path: '/users/:id', id: 'get-user' })
    const postUsers = makeEndpoint({ method: 'POST', path: '/users', id: 'post-users' })

    expect(matchEndpoint('GET', '/users', noQuery, noHeaders, noBody, [getUsers, getUser, postUsers])).toBe(getUsers)
    expect(matchEndpoint('GET', '/users/42', noQuery, noHeaders, noBody, [getUsers, getUser, postUsers])).toBe(getUser)
    expect(matchEndpoint('POST', '/users', noQuery, noHeaders, noBody, [getUsers, getUser, postUsers])).toBe(postUsers)
  })

  // --- Testes de scoring com regras ---

  it('endpoint sem regras é fallback com score 0', () => {
    const fallback = makeEndpoint({ method: 'GET', path: '/items', id: 'fallback', matchingRules: [] })
    const result = matchEndpoint('GET', '/items', noQuery, noHeaders, noBody, [fallback])
    expect(result).toBe(fallback)
  })

  it('endpoint com 1 regra satisfeita vence sobre fallback (score 0)', () => {
    const fallback = makeEndpoint({
      method: 'GET',
      path: '/items',
      id: 'fallback',
      responseBody: '{"type":"fallback"}',
      matchingRules: [],
    })
    const specific = makeEndpoint({
      method: 'GET',
      path: '/items',
      id: 'specific',
      responseBody: '{"type":"specific"}',
      matchingRules: [makeRule({ id: 'r1', endpointId: 'specific', source: 'query', field: 'status', operator: 'eq', value: 'active' })],
    })
    const result = matchEndpoint('GET', '/items', { status: 'active' }, noHeaders, noBody, [fallback, specific])
    expect(result).toBe(specific)
  })

  it('endpoint com 2 regras satisfeitas vence sobre endpoint com 1 regra', () => {
    const oneRule = makeEndpoint({
      method: 'POST',
      path: '/orders',
      id: 'one-rule',
      responseBody: '{"rules":1}',
      matchingRules: [
        makeRule({ id: 'r1', endpointId: 'one-rule', source: 'body', field: 'type', operator: 'eq', value: 'pix' }),
      ],
    })
    const twoRules = makeEndpoint({
      method: 'POST',
      path: '/orders',
      id: 'two-rules',
      responseBody: '{"rules":2}',
      matchingRules: [
        makeRule({ id: 'r2', endpointId: 'two-rules', source: 'body', field: 'type', operator: 'eq', value: 'pix' }),
        makeRule({ id: 'r3', endpointId: 'two-rules', source: 'body', field: 'amount', operator: 'exists' }),
      ],
    })
    const reqBody = { type: 'pix', amount: 100 }
    const result = matchEndpoint('POST', '/orders', noQuery, noHeaders, reqBody, [oneRule, twoRules])
    expect(result).toBe(twoRules)
  })

  it('candidato com regra não satisfeita é descartado', () => {
    const withRule = makeEndpoint({
      method: 'GET',
      path: '/products',
      id: 'with-rule',
      responseBody: '{"matched":true}',
      matchingRules: [
        makeRule({ id: 'r1', endpointId: 'with-rule', source: 'query', field: 'category', operator: 'eq', value: 'books' }),
      ],
    })
    // Request sem query param category=books — a regra não é satisfeita
    const result = matchEndpoint('GET', '/products', { category: 'electronics' }, noHeaders, noBody, [withRule])
    expect(result).toBeNull()
  })

  it('candidato com regra não satisfeita é descartado; fallback sem regras responde', () => {
    const fallback = makeEndpoint({
      method: 'GET',
      path: '/products',
      id: 'fallback',
      responseBody: '{"type":"fallback"}',
      matchingRules: [],
    })
    const withRule = makeEndpoint({
      method: 'GET',
      path: '/products',
      id: 'with-rule',
      responseBody: '{"type":"specific"}',
      matchingRules: [
        makeRule({ id: 'r1', endpointId: 'with-rule', source: 'query', field: 'category', operator: 'eq', value: 'books' }),
      ],
    })
    // Regra não satisfeita → descarta withRule, fallback responde
    const result = matchEndpoint('GET', '/products', { category: 'electronics' }, noHeaders, noBody, [fallback, withRule])
    expect(result).toBe(fallback)
  })

  it('empate de score: createdAt mais recente ganha', () => {
    const older = makeEndpoint({
      method: 'GET',
      path: '/search',
      id: 'older',
      responseBody: '{"version":"older"}',
      createdAt: '2026-01-01T00:00:00.000Z',
      matchingRules: [
        makeRule({ id: 'r1', endpointId: 'older', source: 'query', field: 'q', operator: 'exists' }),
      ],
    })
    const newer = makeEndpoint({
      method: 'GET',
      path: '/search',
      id: 'newer',
      responseBody: '{"version":"newer"}',
      createdAt: '2026-06-01T00:00:00.000Z',
      matchingRules: [
        makeRule({ id: 'r2', endpointId: 'newer', source: 'query', field: 'q', operator: 'exists' }),
      ],
    })
    // Ambos têm score 1 — newer deve ganhar
    const result = matchEndpoint('GET', '/search', { q: 'test' }, noHeaders, noBody, [older, newer])
    expect(result).toBe(newer)
  })

  it('regra de header é case-insensitive no nome do campo', () => {
    const endpoint = makeEndpoint({
      method: 'GET',
      path: '/secure',
      id: 'secure',
      matchingRules: [
        // Regra define 'X-Tenant-ID' em maiúsculas
        makeRule({ id: 'r1', endpointId: 'secure', source: 'header', field: 'X-Tenant-ID', operator: 'eq', value: 'abc' }),
      ],
    })
    // Headers já normalizados para lowercase pelo handler
    const result = matchEndpoint('GET', '/secure', noQuery, { 'x-tenant-id': 'abc' }, noBody, [endpoint])
    expect(result).toBe(endpoint)
  })

  it('regra de body com dot notation acessa campo aninhado', () => {
    const endpoint = makeEndpoint({
      method: 'POST',
      path: '/payments',
      id: 'nested',
      matchingRules: [
        makeRule({ id: 'r1', endpointId: 'nested', source: 'body', field: 'payment.type', operator: 'eq', value: 'credit' }),
      ],
    })
    const result = matchEndpoint('POST', '/payments', noQuery, noHeaders, { payment: { type: 'credit' } }, [endpoint])
    expect(result).toBe(endpoint)
  })

  it('body não-JSON faz regra de body falhar silenciosamente', () => {
    const withBodyRule = makeEndpoint({
      method: 'POST',
      path: '/data',
      id: 'body-rule',
      matchingRules: [
        makeRule({ id: 'r1', endpointId: 'body-rule', source: 'body', field: 'type', operator: 'eq', value: 'json' }),
      ],
    })
    const fallback = makeEndpoint({
      method: 'POST',
      path: '/data',
      id: 'fallback',
      matchingRules: [],
    })
    // body é null (não-JSON) → regra de body falha → body-rule descartado → fallback responde
    const result = matchEndpoint('POST', '/data', noQuery, noHeaders, null, [withBodyRule, fallback])
    expect(result).toBe(fallback)
  })
})
