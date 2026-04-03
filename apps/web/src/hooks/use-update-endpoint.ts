import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@web/lib/api-client'
import type { Endpoint, UpdateEndpointInput } from '@web/types/endpoint'

export function useUpdateEndpoint(id: string) {
  const queryClient = useQueryClient()
  return useMutation<Endpoint, Error, UpdateEndpointInput>({
    mutationFn: (input) => apiClient.put<Endpoint>(`/endpoints/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
  })
}
