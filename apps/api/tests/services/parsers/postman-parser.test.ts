import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PostmanParser } from '../../../src/services/parsers/postman-parser.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '../../fixtures')

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'))
}

describe('PostmanParser', () => {
  const parser = new PostmanParser()

  describe('collection simples', () => {
    it('extrai 5 requests de uma collection simples', () => {
      const data = loadFixture('postman-simple.json')
      const result = parser.parse(data)

      expect(result.success).toBe(true)
      expect(result.endpoints).toHaveLength(5)
      expect(result.errors).toHaveLength(0)
    })

    it('normaliza paths corretamente', () => {
      const data = loadFixture('postman-simple.json')
      const result = parser.parse(data)

      expect(result.endpoints[0].path).toBe('/users')
      expect(result.endpoints[2].path).toBe('/users/:id')
    })

    it('define valores default corretos', () => {
      const data = loadFixture('postman-simple.json')
      const result = parser.parse(data)
      const ep = result.endpoints[0]

      expect(ep.active).toBe(true)
      expect(ep.responseStatus).toBe(200)
      expect(ep.responseBody).toBe('{}')
      expect(ep.delay).toBe(0)
      expect(ep.matchingRules).toEqual([])
      expect(ep.responseHeaders).toEqual({})
    })

    it('mapeia métodos HTTP corretamente', () => {
      const data = loadFixture('postman-simple.json')
      const result = parser.parse(data)

      const methods = result.endpoints.map((e) => e.method)
      expect(methods).toContain('GET')
      expect(methods).toContain('POST')
      expect(methods).toContain('PUT')
      expect(methods).toContain('DELETE')
    })
  })

  describe('collection com folders aninhadas', () => {
    it('extrai requests de 3 níveis de profundidade', () => {
      const data = loadFixture('postman-nested.json')
      const result = parser.parse(data)

      expect(result.success).toBe(true)
      expect(result.endpoints).toHaveLength(4)
    })

    it('inclui request do nível raiz', () => {
      const data = loadFixture('postman-nested.json')
      const result = parser.parse(data)

      const paths = result.endpoints.map((e) => e.path)
      expect(paths).toContain('/root')
    })

    it('inclui request de nível profundo', () => {
      const data = loadFixture('postman-nested.json')
      const result = parser.parse(data)

      const paths = result.endpoints.map((e) => e.path)
      expect(paths).toContain('/deep')
    })
  })

  describe('normalização de variáveis Postman', () => {
    it('converte {{var}} para :var', () => {
      const data = loadFixture('postman-variables.json')
      const result = parser.parse(data)

      expect(result.success).toBe(true)
      const itemIdPath = result.endpoints.find((e) => e.path.includes('itemId'))
      expect(itemIdPath).toBeDefined()
      expect(itemIdPath!.path).toBe('/items/:itemId')
    })

    it('converte {param} para :param', () => {
      const data = loadFixture('postman-variables.json')
      const result = parser.parse(data)

      const openApiStylePath = result.endpoints.find((e) => e.path.includes('subId'))
      expect(openApiStylePath).toBeDefined()
      expect(openApiStylePath!.path).toContain(':itemId')
      expect(openApiStylePath!.path).toContain(':subId')
    })

    it('normaliza URL string raw com variáveis', () => {
      const data = loadFixture('postman-variables.json')
      const result = parser.parse(data)

      const rawUrlRequest = result.endpoints.find((e) => e.path.includes('version'))
      expect(rawUrlRequest).toBeDefined()
      expect(rawUrlRequest!.path).toContain(':version')
    })
  })

  describe('casos de erro', () => {
    it('retorna erro para collection vazia (sem items)', () => {
      const data = {
        info: { schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: [],
      }
      const result = parser.parse(data)

      expect(result.success).toBe(false)
      expect(result.endpoints).toHaveLength(0)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].message).toContain('Nenhum endpoint encontrado')
    })

    it('retorna erro para collection v1 (schema não contém v2)', () => {
      const data = {
        info: { schema: 'https://schema.getpostman.com/json/collection/v1.0.0/collection.json' },
        item: [{ name: 'test', request: { method: 'GET', url: '/test' } }],
      }
      const result = parser.parse(data)

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain('Versão')
    })

    it('retorna erro quando campo info está ausente', () => {
      const data = { item: [] }
      const result = parser.parse(data)

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain('info')
    })

    it('retorna erro quando conteúdo não é objeto', () => {
      const result = parser.parse('não é um objeto')

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain('inválido')
    })

    it('ignora requests com métodos inválidos silenciosamente', () => {
      const data = {
        info: { schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: [
          { name: 'Valid', request: { method: 'GET', url: '/valid' } },
          { name: 'Invalid', request: { method: 'CONNECT', url: '/invalid' } },
        ],
      }
      const result = parser.parse(data)

      expect(result.success).toBe(true)
      expect(result.endpoints).toHaveLength(1)
    })
  })
})
