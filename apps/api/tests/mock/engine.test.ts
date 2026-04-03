import { describe, it, expect } from 'vitest'
import { matchEndpoint } from '../../src/mock/engine.js'
import type { Endpoint } from '../../src/types/endpoint.js'

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
    ...overrides,
  }
}

describe('matchEndpoint', () => {
  it('retorna null para lista vazia de endpoints', () => {
    expect(matchEndpoint('GET', '/users', [])).toBeNull()
  })

  it('faz match exato em path estático', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users' })
    expect(matchEndpoint('GET', '/users', [endpoint])).toBe(endpoint)
  })

  it('faz match com um parâmetro dinâmico', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users/:id' })
    expect(matchEndpoint('GET', '/users/123', [endpoint])).toBe(endpoint)
  })

  it('faz match com múltiplos parâmetros dinâmicos', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/orgs/:org/repos/:repo' })
    expect(matchEndpoint('GET', '/orgs/acme/repos/api', [endpoint])).toBe(endpoint)
  })

  it('não faz match quando o método é diferente', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users' })
    expect(matchEndpoint('POST', '/users', [endpoint])).toBeNull()
  })

  it('não faz match quando o path não existe', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users' })
    expect(matchEndpoint('GET', '/products', [endpoint])).toBeNull()
  })

  it('não faz match quando path com param não bate em path mais curto', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users/:id' })
    expect(matchEndpoint('GET', '/users', [endpoint])).toBeNull()
  })

  it('não faz match quando path tem segmentos extras além do param', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users/:id' })
    expect(matchEndpoint('GET', '/users/123/posts', [endpoint])).toBeNull()
  })

  it('path estático tem prioridade sobre path com parâmetro', () => {
    const staticEndpoint = makeEndpoint({ method: 'GET', path: '/users/me', id: 'static' })
    const dynamicEndpoint = makeEndpoint({ method: 'GET', path: '/users/:id', id: 'dynamic' })
    const result = matchEndpoint('GET', '/users/me', [dynamicEndpoint, staticEndpoint])
    expect(result).toBe(staticEndpoint)
  })

  it('matching é case-insensitive no método HTTP', () => {
    const endpoint = makeEndpoint({ method: 'GET', path: '/users' })
    expect(matchEndpoint('get', '/users', [endpoint])).toBe(endpoint)
  })

  it('não faz match em path completamente diferente', () => {
    const endpoints = [
      makeEndpoint({ method: 'GET', path: '/users' }),
      makeEndpoint({ method: 'POST', path: '/users' }),
    ]
    expect(matchEndpoint('DELETE', '/users', endpoints)).toBeNull()
  })

  it('seleciona o endpoint correto entre vários', () => {
    const getUsers = makeEndpoint({ method: 'GET', path: '/users', id: 'get-users' })
    const getUser = makeEndpoint({ method: 'GET', path: '/users/:id', id: 'get-user' })
    const postUsers = makeEndpoint({ method: 'POST', path: '/users', id: 'post-users' })

    expect(matchEndpoint('GET', '/users', [getUsers, getUser, postUsers])).toBe(getUsers)
    expect(matchEndpoint('GET', '/users/42', [getUsers, getUser, postUsers])).toBe(getUser)
    expect(matchEndpoint('POST', '/users', [getUsers, getUser, postUsers])).toBe(postUsers)
  })
})
