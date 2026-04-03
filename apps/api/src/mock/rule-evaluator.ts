import type { MatchingRule } from '../types/endpoint.js'

/**
 * Extrai valor de um campo aninhado via dot notation.
 * Ex: getNestedValue({a: {b: 1}}, 'a.b') → '1'
 * Ex: getNestedValue({items: ['x']}, 'items.0') → 'x'
 * Retorna undefined se o caminho não existir.
 */
export function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  if (current === null || current === undefined) return undefined
  return String(current)
}

/**
 * Avalia uma única regra contra os dados da request.
 * @param rule - a regra a avaliar
 * @param queryParams - query params da request (Record<string, string>)
 * @param headers - headers da request em lowercase (Record<string, string>)
 * @param body - body parseado (objeto JSON) ou null se não-JSON
 */
export function evaluateRule(
  rule: MatchingRule,
  queryParams: Record<string, string>,
  headers: Record<string, string>,
  body: Record<string, unknown> | null,
): boolean {
  let fieldValue: string | undefined

  if (rule.source === 'query') {
    fieldValue = queryParams[rule.field]
  } else if (rule.source === 'header') {
    fieldValue = headers[rule.field.toLowerCase()]
  } else if (rule.source === 'body') {
    // Por que: body null significa que o Content-Type não é application/json ou não há payload.
    // Todas as regras de source body falham neste caso (inclusive not_exists) porque
    // não é possível avaliar campos de um body inexistente/inelegível.
    if (body === null) return false
    fieldValue = getNestedValue(body, rule.field)
  }

  switch (rule.operator) {
    case 'exists':
      return fieldValue !== undefined
    case 'not_exists':
      return fieldValue === undefined
    case 'eq':
      return fieldValue !== undefined && fieldValue === rule.value
    case 'neq':
      // Por que: campo inexistente também satisfaz "diferente de X" — ver design.md
      return fieldValue === undefined || fieldValue !== rule.value
    case 'contains':
      return fieldValue !== undefined && rule.value !== null && fieldValue.includes(rule.value)
    default:
      return false
  }
}
