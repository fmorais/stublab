import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import { OpenApiParser } from '../../../src/services/parsers/openapi-parser.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '../../fixtures')

function loadJsonFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'))
}

function loadYamlFixture(name: string): unknown {
  return yaml.load(readFileSync(join(fixturesDir, name), 'utf-8'))
}

describe('OpenApiParser', () => {
  const parser = new OpenApiParser()

  describe('Swagger 2.0', () => {
    it('extrai endpoints do Petstore Swagger 2.0', async () => {
      const data = loadJsonFixture('swagger-2.0.json')
      const result = await parser.parse(data)

      expect(result.success).toBe(true)
      expect(result.endpoints.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
    })

    it('normaliza paths convertendo {param} para :param', async () => {
      const data = loadJsonFixture('swagger-2.0.json')
      const result = await parser.parse(data)

      const byIdEndpoint = result.endpoints.find((e) => e.path.includes(':id'))
      expect(byIdEndpoint).toBeDefined()
      expect(byIdEndpoint!.path).toBe('/pets/:id')
    })

    it('usa operationId como name quando disponível', async () => {
      const data = loadJsonFixture('swagger-2.0.json')
      const result = await parser.parse(data)

      const listPets = result.endpoints.find((e) => e.name === 'listPets')
      expect(listPets).toBeDefined()
    })

    it('infere responseStatus do primeiro 2xx', async () => {
      const data = loadJsonFixture('swagger-2.0.json')
      const result = await parser.parse(data)

      const createPet = result.endpoints.find((e) => e.name === 'createPet')
      expect(createPet).toBeDefined()
      expect(createPet!.responseStatus).toBe(201)
    })

    it('gera responseBody a partir do schema', async () => {
      const data = loadJsonFixture('swagger-2.0.json')
      const result = await parser.parse(data)

      const listPets = result.endpoints.find((e) => e.name === 'listPets')
      expect(listPets).toBeDefined()
      const body = JSON.parse(listPets!.responseBody)
      expect(Array.isArray(body)).toBe(true)
    })

    it('define Content-Type: application/json nos headers', async () => {
      const data = loadJsonFixture('swagger-2.0.json')
      const result = await parser.parse(data)

      const listPets = result.endpoints.find((e) => e.name === 'listPets')
      expect(listPets!.responseHeaders['Content-Type']).toBe('application/json')
    })
  })

  describe('OpenAPI 3.0.3 com $ref', () => {
    it('extrai endpoints e derreferencia $ref automaticamente', async () => {
      const data = loadJsonFixture('openapi-3.0.json')
      const result = await parser.parse(data)

      expect(result.success).toBe(true)
      expect(result.endpoints.length).toBeGreaterThan(0)
    })

    it('usa example direto quando disponível', async () => {
      const data = loadJsonFixture('openapi-3.0.json')
      const result = await parser.parse(data)

      const getUser = result.endpoints.find((e) => e.name === 'getUser')
      expect(getUser).toBeDefined()
      const body = JSON.parse(getUser!.responseBody)
      expect(body).toHaveProperty('id', 'abc-123')
    })

    it('gera responseBody a partir do schema dereferenciado', async () => {
      const data = loadJsonFixture('openapi-3.0.json')
      const result = await parser.parse(data)

      const listUsers = result.endpoints.find((e) => e.name === 'listUsers')
      expect(listUsers).toBeDefined()
      const body = JSON.parse(listUsers!.responseBody)
      expect(Array.isArray(body)).toBe(true)
    })
  })

  describe('OpenAPI 3.1.0 YAML com examples', () => {
    it('parseia spec YAML corretamente', async () => {
      const data = loadYamlFixture('openapi-3.1.yaml')
      const result = await parser.parse(data)

      expect(result.success).toBe(true)
      expect(result.endpoints.length).toBeGreaterThan(0)
    })

    it('usa examples block quando disponível', async () => {
      const data = loadYamlFixture('openapi-3.1.yaml')
      const result = await parser.parse(data)

      const createProduct = result.endpoints.find((e) => e.name === 'createProduct')
      expect(createProduct).toBeDefined()
      const body = JSON.parse(createProduct!.responseBody)
      expect(body).toHaveProperty('name', 'Sample Product')
    })

    it('gera enum usando primeiro valor', async () => {
      const data = loadYamlFixture('openapi-3.1.yaml')
      const result = await parser.parse(data)

      const getProduct = result.endpoints.find((e) => e.name === 'getProduct')
      expect(getProduct).toBeDefined()
      const body = JSON.parse(getProduct!.responseBody)
      expect(body.category).toBe('electronics')
    })
  })

  describe('casos de erro', () => {
    it('retorna erro para spec sem paths', async () => {
      const data = {
        openapi: '3.0.0',
        info: { title: 'Empty', version: '1.0.0' },
        paths: {},
      }
      const result = await parser.parse(data)

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain('paths')
    })

    it('retorna erro para spec sem campo openapi/swagger', async () => {
      const data = { info: { title: 'Invalid' } }
      const result = await parser.parse(data)

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain('openapi')
    })

    it('retorna erro para conteúdo que não é objeto', async () => {
      const result = await parser.parse('não é um objeto')

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain('inválido')
    })

    it('retorna erro para spec com versão inválida rejeitada pelo swagger-parser', async () => {
      const data = {
        openapi: '99.0.0',
        info: { title: 'Invalid version', version: '1.0.0' },
        paths: { '/test': { get: { responses: { '200': { description: 'ok' } } } } },
      }
      const result = await parser.parse(data)

      expect(result.success).toBe(false)
    })
  })

  describe('fallback de name', () => {
    it('usa METHOD path como name quando operationId ausente', async () => {
      const data = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      }
      const result = await parser.parse(data)

      expect(result.success).toBe(true)
      expect(result.endpoints[0].name).toBe('GET /items')
    })
  })
})
