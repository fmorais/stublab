import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import type { Endpoint } from '../types/endpoint'

export function useToggleEndpoint(slug: string) {
  const queryClient = useQueryClient()

  return useMutation<Endpoint, Error, string>({
    mutationFn: (id) => apiClient.patch<Endpoint>(`/workspaces/${slug}/endpoints/${id}/toggle`),
    onMutate: async (id) => {
      const queryKey = ['workspaces', slug, 'endpoints']
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Endpoint[]>(queryKey)
      queryClient.setQueryData<Endpoint[]>(queryKey, (old) =>
        old?.map((ep) => (ep.id === id ? { ...ep, active: !ep.active } : ep)) ?? [],
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      const ctx = context as { previous?: Endpoint[] } | undefined
      if (ctx?.previous) {
        queryClient.setQueryData(['workspaces', slug, 'endpoints'], ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', slug, 'endpoints'] })
    },
  })
}
