import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import type { Endpoint, CreateEndpointInput } from '../types/endpoint'

export function useCreateEndpoint(slug: string) {
  const queryClient = useQueryClient()

  return useMutation<Endpoint, Error, CreateEndpointInput>({
    mutationFn: (data) => apiClient.post<Endpoint>(`/workspaces/${slug}/endpoints`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', slug, 'endpoints'] })
      queryClient.invalidateQueries({ queryKey: ['workspaces', slug] })
    },
  })
}
