import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@web/lib/api-client'
import type { Endpoint } from '@web/types/endpoint'

interface ToggleResponse {
  id: string
  active: boolean
  updatedAt: string
}

interface EndpointsCache {
  data: Endpoint[]
  total: number
}

export function useToggleEndpoint() {
  const queryClient = useQueryClient()
  return useMutation<ToggleResponse, Error, string>({
    mutationFn: (id) => apiClient.patch<ToggleResponse>(`/endpoints/${id}/toggle`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['endpoints'] })
      const snapshots = queryClient.getQueriesData<EndpointsCache>({ queryKey: ['endpoints'] })
      queryClient.setQueriesData<EndpointsCache>({ queryKey: ['endpoints'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((ep) => ep.id === id ? { ...ep, active: !ep.active } : ep),
        }
      })
      return { snapshots }
    },
    onError: (_err, _id, context) => {
      const ctx = context as { snapshots: [unknown, EndpointsCache | undefined][] } | undefined
      ctx?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey as string[], data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
  })
}
