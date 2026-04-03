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
  endpoints: Endpoint[],
): Endpoint | null {
  const upperMethod = method.toUpperCase()

  const candidates = endpoints.filter(
    (e) => e.method.toUpperCase() === upperMethod,
  )

  const sorted = [...candidates].sort(
    (a, b) => countDynamicSegments(a.path) - countDynamicSegments(b.path),
  )

  for (const endpoint of sorted) {
    const regex = pathToRegex(endpoint.path)
    if (regex.test(path)) {
      return endpoint
    }
  }

  return null
}
