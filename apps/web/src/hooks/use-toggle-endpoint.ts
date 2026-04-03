import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@web/lib/api-client'

interface ToggleResponse {
  id: string
  active: boolean
  updatedAt: string
}

export function useToggleEndpoint() {
  const queryClient = useQueryClient()
  return useMutation<ToggleResponse, Error, string>({
    mutationFn: (id) => apiClient.patch<ToggleResponse>(`/endpoints/${id}/toggle`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
      queryClient.invalidateQueries({ queryKey: ['endpoints', id] })
    },
  })
}
