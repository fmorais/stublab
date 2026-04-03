import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'

export function useDeleteEndpoint() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.del(`/endpoints/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
  })
}
