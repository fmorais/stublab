import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import type { Endpoint } from '../types/endpoint'

export function useEndpoints(slug: string) {
  return useQuery<Endpoint[]>({
    queryKey: ['workspaces', slug, 'endpoints'],
    queryFn: () =>
      apiClient
        .get<{ data: Endpoint[]; total: number }>(`/workspaces/${slug}/endpoints`)
        .then((res) => res.data),
    enabled: !!slug,
  })
}

export function useEndpoint(slug: string, id: string) {
  return useQuery<Endpoint>({
    queryKey: ['workspaces', slug, 'endpoints', id],
    queryFn: () => apiClient.get<Endpoint>(`/workspaces/${slug}/endpoints/${id}`),
    enabled: !!slug && !!id,
  })
}
