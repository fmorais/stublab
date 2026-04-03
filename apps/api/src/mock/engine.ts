import { evaluateRule } from './rule-evaluator.js'
import type { Endpoint } from '../types/endpoint.js'

function countDynamicSegments(path: string): number {
  return (path.match(/:[^/]+/g) ?? []).length
}

function pathToRegex(path: string): RegExp {
  const escaped = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  const pattern = escaped.replace(/:[^/]+/g, '[^/]+')
  return new RegExp(`^${pattern}$`)
}

export function matchEndpoint(
  method: string,
  path: string,
  queryParams: Record<string, string>,
  headers: Record<string, string>,
  body: Record<string, unknown> | null,
  endpoints: Endpoint[],
): Endpoint | null {
  const upperMethod = method.toUpperCase()

  // Fase 1: Filtrar por method + path
  const candidates = endpoints.filter((e) => {
    if (!e.active) return false
    if (e.method.toUpperCase() !== upperMethod) return false
    return pathToRegex(e.path).test(path)
  })

  if (candidates.length === 0) return null

  // Fase 2: Ordenar por especificidade de path (menos params dinâmicos primeiro)
  const sorted = [...candidates].sort(
    (a, b) => countDynamicSegments(a.path) - countDynamicSegments(b.path),
  )

  // Fase 3: Avaliar regras e calcular score
  const scored: Array<{ endpoint: Endpoint; score: number }> = []

  for (const endpoint of sorted) {
    const rules = endpoint.matchingRules

    if (rules.length === 0) {
      // Por que: endpoint sem regras é sempre candidato como fallback com score 0
      scored.push({ endpoint, score: 0 })
      continue
    }

    let allSatisfied = true
    for (const rule of rules) {
      if (!evaluateRule(rule, queryParams, headers, body)) {
        allSatisfied = false
        break
      }
    }

    if (allSatisfied) {
      scored.push({ endpoint, score: rules.length })
    }
  }

  if (scored.length === 0) return null

  // Fase 4: Selecionar vencedor — maior score ganha; empate: createdAt mais recente
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Por que: createdAt mais recente permite "sobrescrever" comportamento sem deletar
    return new Date(b.endpoint.createdAt).getTime() - new Date(a.endpoint.createdAt).getTime()
  })

  return scored[0].endpoint
}
