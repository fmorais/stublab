import { cn } from '@web/lib/utils'
import type { HttpMethod } from '@web/types/endpoint'

interface MethodBadgeProps {
  method: HttpMethod
}

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-green-100 text-green-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  PATCH: 'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
}

export function MethodBadge({ method }: MethodBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold',
        METHOD_STYLES[method],
      )}
    >
      {method}
    </span>
  )
}
