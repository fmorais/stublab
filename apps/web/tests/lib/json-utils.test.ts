import { describe, it, expect } from 'vitest'
import { isValidJson } from '@web/lib/json-utils'

describe('isValidJson', () => {
  it('retorna true para objeto vazio "{}"', () => {
    expect(isValidJson('{}')).toBe(true)
  })

  it('retorna true para array vazio "[]"', () => {
    expect(isValidJson('[]')).toBe(true)
  })

  it('retorna true para objeto com chave e valor', () => {
    expect(isValidJson('{"key": "value"}')).toBe(true)
  })

  it('retorna false para string vazia', () => {
    expect(isValidJson('')).toBe(false)
  })

  it('retorna false para string com apenas espaços', () => {
    expect(isValidJson('   ')).toBe(false)
  })

  it('retorna false para JSON inválido "{invalid}"', () => {
    expect(isValidJson('{invalid}')).toBe(false)
  })

  it('retorna true para "null" (JSON válido)', () => {
    expect(isValidJson('null')).toBe(true)
  })
})
