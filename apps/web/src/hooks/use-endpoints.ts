import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import type { Endpoint } from '../types/endpoint'

export function useEndpoints() {
  return useQuery<Endpoint[]>({
    queryKey: ['endpoints'],
    queryFn: () =>
      apiClient
        .get<{ data: Endpoint[]; total: number }>('/endpoints')
        .then((res) => res.data),
  })
}

export function useEndpoint(id: string) {
  return useQuery<Endpoint>({
    queryKey: ['endpoints', id],
    queryFn: () => apiClient.get<Endpoint>(`/endpoints/${id}`),
    enabled: !!id,
  })
}
