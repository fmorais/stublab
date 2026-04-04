import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'

export function useDeleteEndpoint(slug: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.del(`/workspaces/${slug}/endpoints/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', slug, 'endpoints'] })
      queryClient.invalidateQueries({ queryKey: ['workspaces', slug] })
    },
  })
}
