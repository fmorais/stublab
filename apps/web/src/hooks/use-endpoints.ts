import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@web/lib/api-client'
import type { Endpoint, HttpMethod } from '@web/types/endpoint'

interface Filters {
  search?: string
  method?: HttpMethod
  active?: boolean
}

interface EndpointsResponse {
  data: Endpoint[]
  total: number
}

export function useEndpoints(filters: Filters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.method) params.set('method', filters.method)
  if (filters.active !== undefined) params.set('active', String(filters.active))

  const query = params.toString()
  return useQuery<EndpointsResponse>({
    queryKey: ['endpoints', filters],
    queryFn: () => apiClient.get<EndpointsResponse>(`/endpoints${query ? `?${query}` : ''}`),
  })
}
