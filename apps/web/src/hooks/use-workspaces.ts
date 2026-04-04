import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@web/lib/api-client'
import type { WorkspaceWithStats, CreateWorkspaceInput, UpdateWorkspaceInput } from '@web/types/workspace'

export function useWorkspaces() {
  return useQuery<WorkspaceWithStats[]>({
    queryKey: ['workspaces'],
    queryFn: () =>
      apiClient
        .get<{ data: WorkspaceWithStats[]; total: number }>('/workspaces')
        .then((res) => res.data),
  })
}

export function useWorkspace(slug: string) {
  return useQuery<WorkspaceWithStats>({
    queryKey: ['workspaces', slug],
    queryFn: () => apiClient.get<WorkspaceWithStats>(`/workspaces/${slug}`),
    enabled: !!slug,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation<WorkspaceWithStats, Error, CreateWorkspaceInput>({
    mutationFn: (data) => apiClient.post<WorkspaceWithStats>('/workspaces', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation<WorkspaceWithStats, Error, { slug: string; data: UpdateWorkspaceInput }>({
    mutationFn: ({ slug, data }) => apiClient.put<WorkspaceWithStats>(`/workspaces/${slug}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation<void, Error, string>({
    mutationFn: (slug) => apiClient.del(`/workspaces/${slug}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      navigate('/')
    },
  })
}
