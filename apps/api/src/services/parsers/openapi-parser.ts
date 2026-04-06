import SwaggerParser from '@apidevtools/swagger-parser'
import type { ExportedEndpoint } from '../../schemas/import-export.js'
import type { ExternalParser, ParseResult } from './index.js'
import { generateFromSchema } from './schema-example-generator.js'

const VALID_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const
type HttpMethod = (typeof VALID_METHODS)[number]

type PathItemRecord = Record<string, unknown>
type OperationObject = Record<string, unknown>
type ResponsesObject = Record<string, unknown>
type ResponseObject = Record<string, unknown>

function normalizePath(openapiPath: string): string {
  return openapiPath.replace(/\{([^}]+)\}/g, ':$1')
}

function findFirst2xxStatus(responses: ResponsesObject): number {
  for (const key of Object.keys(responses)) {
    const code = parseInt(key, 10)
    if (!isNaN(code) && code >= 200 && code < 300) return code
  }
  return 200
}

function extractResponseBodySwagger2(
  response: ResponseObject,
): { body: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {}

  const schema = response.schema as Record<string, unknown> | undefined
  if (schema) {
    headers['Content-Type'] = 'application/json'
    const example = generateFromSchema(schema)
    if (example !== null) {
      return { body: JSON.stringify(example, null, 2), headers }
    }
  }

  return { body: '{}', headers }
}

function extractResponseBodyOpenApi3(
  response: ResponseObject,
): { body: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {}

  const content = response.content as Record<string, Record<string, unknown>> | undefined
  const jsonContent = content?.['application/json']

  if (!jsonContent) return { body: '{}', headers }

  headers['Content-Type'] = 'application/json'

  if (jsonContent.example !== undefined) {
    return { body: JSON.stringify(jsonContent.example, null, 2), headers }
  }

  const examples = jsonContent.examples as Record<string, Record<string, unknown>> | undefined
  if (examples) {
    const firstKey = Object.keys(examples)[0]
    if (firstKey) {
      const ex = examples[firstKey]
      if (ex.value !== undefined) {
        return { body: JSON.stringify(ex.value, null, 2), headers }
      }
    }
  }

  const schema = jsonContent.schema as Record<string, unknown> | undefined
  if (schema) {
    const example = generateFromSchema(schema)
    if (example !== null) {
      return { body: JSON.stringify(example, null, 2), headers }
    }
  }

  return { body: '{}', headers }
}

export class OpenApiParser implements ExternalParser {
  async parse(content: unknown): Promise<ParseResult> {
    if (typeof content !== 'object' || content === null) {
      return {
        success: false,
        endpoints: [],
        errors: [{ message: 'Conteúdo inválido: esperado objeto JSON ou YAML' }],
      }
    }

    const obj = content as Record<string, unknown>
    const versionField = (obj.openapi ?? obj.swagger) as string | undefined

    if (!versionField) {
      return {
        success: false,
        endpoints: [],
        errors: [{ message: 'Spec inválida: campo "openapi" ou "swagger" não encontrado' }],
      }
    }

    let api: Record<string, unknown>
    try {
      // SwaggerParser.validate dereferences and returns the resolved API object
      // Por que: SwaggerParser.validate aceita OpenAPI.Document mas o tipo de entrada é unknown.
      // O cast via unknown é necessário pois a validação ocorre em runtime pelo parser.
      api = (await SwaggerParser.validate(content as unknown as string)) as unknown as Record<string, unknown>
    } catch (err) {
      return {
        success: false,
        endpoints: [],
        errors: [{ message: `Spec inválida: ${(err as Error).message}` }],
      }
    }

    const paths = api.paths as Record<string, PathItemRecord> | undefined
    if (!paths || Object.keys(paths).length === 0) {
      return {
        success: false,
        endpoints: [],
        errors: [{ message: 'Spec sem paths definidos' }],
      }
    }

    const isSwagger2 = typeof api.swagger === 'string'
    const endpoints: ExportedEndpoint[] = []

    for (const [rawPath, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue
      const normalizedPath = normalizePath(rawPath)

      for (const method of VALID_METHODS) {
        const operation = pathItem[method] as OperationObject | undefined
        if (!operation) continue

        const operationId = operation.operationId as string | undefined
        const name = operationId ?? `${method.toUpperCase()} ${normalizedPath}`

        const responses = (operation.responses ?? {}) as ResponsesObject
        const statusCode = findFirst2xxStatus(responses)

        let responseBody = '{}'
        let responseHeaders: Record<string, string> = {}

        const responseObj = responses[String(statusCode)] as ResponseObject | undefined

        if (responseObj) {
          if (isSwagger2) {
            const extracted = extractResponseBodySwagger2(responseObj)
            responseBody = extracted.body
            responseHeaders = extracted.headers
          } else {
            const extracted = extractResponseBodyOpenApi3(responseObj)
            responseBody = extracted.body
            responseHeaders = extracted.headers
          }
        }

        endpoints.push({
          name,
          method: method.toUpperCase() as ExportedEndpoint['method'],
          path: normalizedPath,
          active: true,
          responseStatus: statusCode,
          responseBody,
          responseHeaders,
          delay: 0,
          matchingRules: [],
        })
      }
    }

    return {
      success: true,
      endpoints,
      errors: [],
    }
  }
}
