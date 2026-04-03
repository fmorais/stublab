import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@web/lib/api-client'
import type { Endpoint, CreateEndpointInput } from '@web/types/endpoint'

export function useCreateEndpoint() {
  const queryClient = useQueryClient()
  return useMutation<Endpoint, Error, CreateEndpointInput>({
    mutationFn: (input) => apiClient.post<Endpoint>('/endpoints', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
  })
}
