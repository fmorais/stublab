import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import type { Endpoint, UpdateEndpointInput } from '../types/endpoint'

interface UpdateEndpointVariables {
  id: string
  data: UpdateEndpointInput
}

export function useUpdateEndpoint() {
  const queryClient = useQueryClient()

  return useMutation<Endpoint, Error, UpdateEndpointVariables>({
    mutationFn: ({ id, data }) => apiClient.put<Endpoint>(`/endpoints/${id}`, data),
    onSuccess: (_endpoint, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
      queryClient.invalidateQueries({ queryKey: ['endpoints', id] })
    },
  })
}
