import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import type { Endpoint, CreateEndpointInput } from '../types/endpoint'

export function useCreateEndpoint() {
  const queryClient = useQueryClient()

  return useMutation<Endpoint, Error, CreateEndpointInput>({
    mutationFn: (data) => apiClient.post<Endpoint>('/endpoints', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
  })
}
