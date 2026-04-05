export function generateFromSchema(schema: Record<string, unknown>, depth = 0): unknown {
  const MAX_DEPTH = 3
  if (depth > MAX_DEPTH) return null

  if (schema.example !== undefined) return schema.example

  // enum — use first value
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0]

  switch (schema.type) {
    case 'string':
      if (schema.format === 'date') return '2026-01-01'
      if (schema.format === 'date-time') return '2026-01-01T00:00:00Z'
      if (schema.format === 'email') return 'user@example.com'
      if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000'
      return 'string'

    case 'integer':
    case 'number':
      if (typeof schema.minimum === 'number') return schema.minimum
      return 0

    case 'boolean':
      return false

    case 'array': {
      const items = schema.items as Record<string, unknown> | undefined
      if (items) {
        const item = generateFromSchema(items, depth + 1)
        return item !== null ? [item] : []
      }
      return []
    }

    case 'object': {
      const properties = schema.properties as Record<string, Record<string, unknown>> | undefined
      if (properties) {
        const obj: Record<string, unknown> = {}
        for (const [key, propSchema] of Object.entries(properties)) {
          obj[key] = generateFromSchema(propSchema, depth + 1)
        }
        return obj
      }
      return {}
    }

    default: {
      // allOf, oneOf, anyOf — use first schema
      const allOf = schema.allOf as Record<string, unknown>[] | undefined
      if (allOf?.[0]) return generateFromSchema(allOf[0], depth)
      const oneOf = schema.oneOf as Record<string, unknown>[] | undefined
      if (oneOf?.[0]) return generateFromSchema(oneOf[0], depth)
      const anyOf = schema.anyOf as Record<string, unknown>[] | undefined
      if (anyOf?.[0]) return generateFromSchema(anyOf[0], depth)
      return null
    }
  }
}
