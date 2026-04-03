import { describe, it, expect } from 'vitest'
import { getNestedValue, evaluateRule } from '../../src/mock/rule-evaluator.js'
import type { MatchingRule } from '../../src/types/endpoint.js'

function makeRule(overrides: Partial<MatchingRule> & Pick<MatchingRule, 'source' | 'field' | 'operator'>): MatchingRule {
  return {
    id: 'rule-id',
    endpointId: 'endpoint-id',
    value: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('getNestedValue', () => {
  it('retorna valor de path simples', () => {
    expect(getNestedValue({ a: 1 }, 'a')).toBe('1')
  })

  it('retorna valor de path aninhado', () => {
    expect(getNestedValue({ a: { b: 'x' } }, 'a.b')).toBe('x')
  })

  it('retorna valor de array via índice numérico', () => {
    expect(getNestedValue({ items: ['foo', 'bar'] }, 'items.1')).toBe('bar')
  })

  it('retorna primeiro elemento de array via índice 0', () => {
    expect(getNestedValue({ items: ['foo'] }, 'items.0')).toBe('foo')
  })

  it('retorna undefined para campo inexistente', () => {
    expect(getNestedValue({ a: 1 }, 'b')).toBeUndefined()
  })

  it('retorna undefined para path aninhado inexistente', () => {
    expect(getNestedValue({ a: {} }, 'a.b.c')).toBeUndefined()
  })

  it('retorna undefined quando obj é null', () => {
    expect(getNestedValue(null, 'a')).toBeUndefined()
  })

  it('retorna undefined quando obj é undefined', () => {
    expect(getNestedValue(undefined, 'a')).toBeUndefined()
  })

  it('retorna undefined quando objeto intermediário é null', () => {
    expect(getNestedValue({ a: null }, 'a.b')).toBeUndefined()
  })

  it('converte número para string', () => {
    expect(getNestedValue({ valor: 100 }, 'valor')).toBe('100')
  })

  it('converte boolean para string', () => {
    expect(getNestedValue({ ativo: true }, 'ativo')).toBe('true')
  })
})

describe('evaluateRule — source query', () => {
  it('eq: retorna true quando valor é igual', () => {
    const rule = makeRule({ source: 'query', field: 'status', operator: 'eq', value: 'ativo' })
    expect(evaluateRule(rule, { status: 'ativo' }, {}, null)).toBe(true)
  })

  it('eq: retorna false quando valor é diferente', () => {
    const rule = makeRule({ source: 'query', field: 'status', operator: 'eq', value: 'ativo' })
    expect(evaluateRule(rule, { status: 'inativo' }, {}, null)).toBe(false)
  })

  it('eq: retorna false quando campo inexistente', () => {
    const rule = makeRule({ source: 'query', field: 'status', operator: 'eq', value: 'ativo' })
    expect(evaluateRule(rule, {}, {}, null)).toBe(false)
  })

  it('neq: retorna true quando valor é diferente', () => {
    const rule = makeRule({ source: 'query', field: 'env', operator: 'neq', value: 'prod' })
    expect(evaluateRule(rule, { env: 'dev' }, {}, null)).toBe(true)
  })

  it('neq: retorna false quando valor é igual', () => {
    const rule = makeRule({ source: 'query', field: 'env', operator: 'neq', value: 'prod' })
    expect(evaluateRule(rule, { env: 'prod' }, {}, null)).toBe(false)
  })

  it('neq: retorna true quando campo está ausente', () => {
    const rule = makeRule({ source: 'query', field: 'env', operator: 'neq', value: 'prod' })
    expect(evaluateRule(rule, {}, {}, null)).toBe(true)
  })

  it('contains: retorna true quando string contém substring', () => {
    const rule = makeRule({ source: 'query', field: 'q', operator: 'contains', value: 'foo' })
    expect(evaluateRule(rule, { q: 'foobar' }, {}, null)).toBe(true)
  })

  it('contains: retorna false quando string não contém substring', () => {
    const rule = makeRule({ source: 'query', field: 'q', operator: 'contains', value: 'xyz' })
    expect(evaluateRule(rule, { q: 'foobar' }, {}, null)).toBe(false)
  })

  it('contains: retorna false quando campo está ausente', () => {
    const rule = makeRule({ source: 'query', field: 'q', operator: 'contains', value: 'foo' })
    expect(evaluateRule(rule, {}, {}, null)).toBe(false)
  })

  it('exists: retorna true quando campo está presente', () => {
    const rule = makeRule({ source: 'query', field: 'token', operator: 'exists' })
    expect(evaluateRule(rule, { token: 'abc' }, {}, null)).toBe(true)
  })

  it('exists: retorna false quando campo está ausente', () => {
    const rule = makeRule({ source: 'query', field: 'token', operator: 'exists' })
    expect(evaluateRule(rule, {}, {}, null)).toBe(false)
  })

  it('not_exists: retorna true quando campo está ausente', () => {
    const rule = makeRule({ source: 'query', field: 'debug', operator: 'not_exists' })
    expect(evaluateRule(rule, {}, {}, null)).toBe(true)
  })

  it('not_exists: retorna false quando campo está presente', () => {
    const rule = makeRule({ source: 'query', field: 'debug', operator: 'not_exists' })
    expect(evaluateRule(rule, { debug: '1' }, {}, null)).toBe(false)
  })
})

describe('evaluateRule — source header', () => {
  it('eq: retorna true com header presente e valor correto', () => {
    const rule = makeRule({ source: 'header', field: 'x-tenant-id', operator: 'eq', value: 'abc' })
    expect(evaluateRule(rule, {}, { 'x-tenant-id': 'abc' }, null)).toBe(true)
  })

  it('eq: retorna false com header de valor diferente', () => {
    const rule = makeRule({ source: 'header', field: 'x-tenant-id', operator: 'eq', value: 'abc' })
    expect(evaluateRule(rule, {}, { 'x-tenant-id': 'xyz' }, null)).toBe(false)
  })

  it('headers são case-insensitive: normaliza field para lowercase ao buscar', () => {
    const rule = makeRule({ source: 'header', field: 'X-Tenant-ID', operator: 'eq', value: 'abc' })
    // caller deve passar headers já em lowercase; field é normalizado internamente
    expect(evaluateRule(rule, {}, { 'x-tenant-id': 'abc' }, null)).toBe(true)
  })

  it('exists: retorna true quando header está presente', () => {
    const rule = makeRule({ source: 'header', field: 'authorization', operator: 'exists' })
    expect(evaluateRule(rule, {}, { authorization: 'Bearer token' }, null)).toBe(true)
  })

  it('exists: retorna false quando header está ausente', () => {
    const rule = makeRule({ source: 'header', field: 'authorization', operator: 'exists' })
    expect(evaluateRule(rule, {}, {}, null)).toBe(false)
  })

  it('not_exists: retorna true quando header está ausente', () => {
    const rule = makeRule({ source: 'header', field: 'x-debug', operator: 'not_exists' })
    expect(evaluateRule(rule, {}, {}, null)).toBe(true)
  })

  it('not_exists: retorna false quando header está presente', () => {
    const rule = makeRule({ source: 'header', field: 'x-debug', operator: 'not_exists' })
    expect(evaluateRule(rule, {}, { 'x-debug': '1' }, null)).toBe(false)
  })

  it('contains: retorna true quando valor do header contém substring', () => {
    const rule = makeRule({ source: 'header', field: 'user-agent', operator: 'contains', value: 'Mozilla' })
    expect(evaluateRule(rule, {}, { 'user-agent': 'Mozilla/5.0' }, null)).toBe(true)
  })
})

describe('evaluateRule — source body', () => {
  it('retorna false para qualquer operador quando body é null', () => {
    const operators = ['eq', 'neq', 'contains', 'exists', 'not_exists'] as const
    for (const operator of operators) {
      const rule = makeRule({ source: 'body', field: 'tipo', operator, value: 'PIX' })
      expect(evaluateRule(rule, {}, {}, null)).toBe(false)
    }
  })

  it('eq: retorna true para campo simples com valor igual', () => {
    const rule = makeRule({ source: 'body', field: 'tipo', operator: 'eq', value: 'PIX' })
    expect(evaluateRule(rule, {}, {}, { tipo: 'PIX' })).toBe(true)
  })

  it('eq: retorna false para campo simples com valor diferente', () => {
    const rule = makeRule({ source: 'body', field: 'tipo', operator: 'eq', value: 'PIX' })
    expect(evaluateRule(rule, {}, {}, { tipo: 'TED' })).toBe(false)
  })

  it('eq: retorna true para campo aninhado com valor correto', () => {
    const rule = makeRule({ source: 'body', field: 'pagamento.tipo', operator: 'eq', value: 'PIX' })
    expect(evaluateRule(rule, {}, {}, { pagamento: { tipo: 'PIX' } })).toBe(true)
  })

  it('eq: retorna false para campo aninhado inexistente', () => {
    const rule = makeRule({ source: 'body', field: 'pagamento.cartao.numero', operator: 'eq', value: '1234' })
    expect(evaluateRule(rule, {}, {}, { pagamento: {} })).toBe(false)
  })

  it('eq: converte número para string na comparação', () => {
    const rule = makeRule({ source: 'body', field: 'valor', operator: 'eq', value: '100' })
    expect(evaluateRule(rule, {}, {}, { valor: 100 })).toBe(true)
  })

  it('exists: retorna true quando campo está presente', () => {
    const rule = makeRule({ source: 'body', field: 'metadata', operator: 'exists' })
    expect(evaluateRule(rule, {}, {}, { metadata: { info: 'x' } })).toBe(true)
  })

  it('exists: retorna false quando campo está ausente', () => {
    const rule = makeRule({ source: 'body', field: 'metadata', operator: 'exists' })
    expect(evaluateRule(rule, {}, {}, { outro: 'campo' })).toBe(false)
  })

  it('not_exists: retorna true quando campo está ausente', () => {
    const rule = makeRule({ source: 'body', field: 'debug', operator: 'not_exists' })
    expect(evaluateRule(rule, {}, {}, { tipo: 'PIX' })).toBe(true)
  })

  it('not_exists: retorna false quando campo está presente', () => {
    const rule = makeRule({ source: 'body', field: 'debug', operator: 'not_exists' })
    expect(evaluateRule(rule, {}, {}, { debug: true })).toBe(false)
  })

  it('contains: retorna true quando campo contém substring', () => {
    const rule = makeRule({ source: 'body', field: 'descricao', operator: 'contains', value: 'urgente' })
    expect(evaluateRule(rule, {}, {}, { descricao: 'pedido urgente de reembolso' })).toBe(true)
  })

  it('contains: retorna false quando campo não contém substring', () => {
    const rule = makeRule({ source: 'body', field: 'descricao', operator: 'contains', value: 'urgente' })
    expect(evaluateRule(rule, {}, {}, { descricao: 'pedido normal' })).toBe(false)
  })

  it('eq com índice de array via dot notation', () => {
    const rule = makeRule({ source: 'body', field: 'itens.0.sku', operator: 'eq', value: 'ABC123' })
    expect(evaluateRule(rule, {}, {}, { itens: [{ sku: 'ABC123' }] })).toBe(true)
  })
})
