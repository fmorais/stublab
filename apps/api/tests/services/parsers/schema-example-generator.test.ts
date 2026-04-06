import { describe, it, expect } from 'vitest'
import { generateFromSchema } from '../../../src/services/parsers/schema-example-generator.js'

describe('generateFromSchema', () => {
  describe('tipos primitivos', () => {
    it('retorna "string" para type string', () => {
      expect(generateFromSchema({ type: 'string' })).toBe('string')
    })

    it('retorna 0 para type integer', () => {
      expect(generateFromSchema({ type: 'integer' })).toBe(0)
    })

    it('retorna 0 para type number', () => {
      expect(generateFromSchema({ type: 'number' })).toBe(0)
    })

    it('retorna false para type boolean', () => {
      expect(generateFromSchema({ type: 'boolean' })).toBe(false)
    })

    it('retorna minimum quando definido para number', () => {
      expect(generateFromSchema({ type: 'number', minimum: 5 })).toBe(5)
    })
  })

  describe('formatos de string', () => {
    it('retorna data para format date', () => {
      expect(generateFromSchema({ type: 'string', format: 'date' })).toBe('2026-01-01')
    })

    it('retorna datetime para format date-time', () => {
      expect(generateFromSchema({ type: 'string', format: 'date-time' })).toBe('2026-01-01T00:00:00Z')
    })

    it('retorna email para format email', () => {
      expect(generateFromSchema({ type: 'string', format: 'email' })).toBe('user@example.com')
    })

    it('retorna uuid para format uuid', () => {
      expect(generateFromSchema({ type: 'string', format: 'uuid' })).toBe('00000000-0000-0000-0000-000000000000')
    })
  })

  describe('enum', () => {
    it('retorna primeiro valor do enum', () => {
      expect(generateFromSchema({ type: 'string', enum: ['active', 'inactive'] })).toBe('active')
    })

    it('usa enum mesmo sem type', () => {
      expect(generateFromSchema({ enum: [1, 2, 3] })).toBe(1)
    })
  })

  describe('example', () => {
    it('usa campo example quando presente', () => {
      expect(generateFromSchema({ type: 'string', example: 'meu-exemplo' })).toBe('meu-exemplo')
    })

    it('example tem prioridade sobre type', () => {
      expect(generateFromSchema({ type: 'integer', example: 42 })).toBe(42)
    })
  })

  describe('array', () => {
    it('retorna array com um item para array de strings', () => {
      const result = generateFromSchema({ type: 'array', items: { type: 'string' } })
      expect(result).toEqual(['string'])
    })

    it('retorna array vazio quando sem items', () => {
      expect(generateFromSchema({ type: 'array' })).toEqual([])
    })
  })

  describe('objeto simples com primitivos', () => {
    it('gera objeto com propriedades', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          active: { type: 'boolean' },
        },
      }
      expect(generateFromSchema(schema)).toEqual({
        id: 0,
        name: 'string',
        active: false,
      })
    })

    it('retorna objeto vazio quando sem properties', () => {
      expect(generateFromSchema({ type: 'object' })).toEqual({})
    })
  })

  describe('objeto com array de objetos', () => {
    it('gera objeto aninhado corretamente', () => {
      const schema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
              },
            },
          },
        },
      }
      expect(generateFromSchema(schema)).toEqual({
        items: [{ id: 0, name: 'string' }],
      })
    })
  })

  describe('allOf, oneOf, anyOf', () => {
    it('usa primeiro schema de allOf', () => {
      const schema = {
        allOf: [{ type: 'object', properties: { id: { type: 'integer' } } }],
      }
      expect(generateFromSchema(schema)).toEqual({ id: 0 })
    })

    it('usa primeiro schema de oneOf', () => {
      const schema = {
        oneOf: [{ type: 'string' }, { type: 'integer' }],
      }
      expect(generateFromSchema(schema)).toBe('string')
    })

    it('usa primeiro schema de anyOf', () => {
      const schema = {
        anyOf: [{ type: 'boolean' }],
      }
      expect(generateFromSchema(schema)).toBe(false)
    })
  })

  describe('schema sem type', () => {
    it('retorna null para schema vazio', () => {
      expect(generateFromSchema({})).toBeNull()
    })
  })

  describe('profundidade máxima', () => {
    it('retorna null quando profundidade excede 3', () => {
      const result = generateFromSchema({ type: 'string' }, 4)
      expect(result).toBeNull()
    })

    it('para recursão em objetos aninhados além de 3 níveis', () => {
      const schema = {
        type: 'object',
        properties: {
          l1: {
            type: 'object',
            properties: {
              l2: {
                type: 'object',
                properties: {
                  l3: {
                    type: 'object',
                    properties: {
                      l4: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      }
      const result = generateFromSchema(schema) as Record<string, unknown>
      // l3.properties.l4 é depth=4 → null
      expect(result.l1).toBeDefined()
    })
  })
})
