import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import type { Endpoint } from '../types/endpoint'

export function useToggleEndpoint() {
  const queryClient = useQueryClient()

  return useMutation<Endpoint, Error, string>({
    mutationFn: (id) => apiClient.patch<Endpoint>(`/endpoints/${id}/toggle`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['endpoints'] })
      const previous = queryClient.getQueryData<Endpoint[]>(['endpoints'])
      queryClient.setQueryData<Endpoint[]>(['endpoints'], (old) =>
        old?.map((ep) => (ep.id === id ? { ...ep, active: !ep.active } : ep)) ?? [],
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      const ctx = context as { previous?: Endpoint[] } | undefined
      if (ctx?.previous) {
        queryClient.setQueryData(['endpoints'], ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
  })
}
