import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@web/lib/api-client'
import type { Endpoint } from '@web/types/endpoint'

export function useEndpoint(id: string) {
  return useQuery<Endpoint>({
    queryKey: ['endpoints', id],
    queryFn: () => apiClient.get<Endpoint>(`/endpoints/${id}`),
    enabled: !!id,
  })
}
