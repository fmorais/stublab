import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@web/lib/api-client'
import type { RecordedInteraction, RecordingsListResponse, SaveRecordingInput, SaveBulkResponse, SaveRecordingResponse } from '@web/types/recording'

interface RecordingsFilters {
  method?: string
  status?: number
  search?: string
  limit?: number
  offset?: number
}

function buildQuery(filters?: RecordingsFilters): string {
  if (!filters) return ''
  const params = new URLSearchParams()
  if (filters.method) params.set('method', filters.method)
  if (filters.status !== undefined) params.set('status', String(filters.status))
  if (filters.search) params.set('search', filters.search)
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  if (filters.offset !== undefined) params.set('offset', String(filters.offset))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useRecordings(slug: string, filters?: RecordingsFilters) {
  return useQuery<RecordingsListResponse>({
    queryKey: ['recordings', slug, filters],
    queryFn: () =>
      apiClient.get<RecordingsListResponse>(`/workspaces/${slug}/recordings${buildQuery(filters)}`),
    enabled: !!slug,
  })
}

export function useRecording(slug: string, id: string) {
  return useQuery<RecordedInteraction>({
    queryKey: ['recordings', slug, id],
    queryFn: () => apiClient.get<RecordedInteraction>(`/workspaces/${slug}/recordings/${id}`),
    enabled: !!slug && !!id,
  })
}

export function useDeleteRecording(slug: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.del(`/workspaces/${slug}/recordings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings', slug] })
    },
  })
}

export function useDiscardRecordings(slug: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { ids: string[] }>({
    mutationFn: (body) => apiClient.post(`/workspaces/${slug}/recordings/discard`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings', slug] })
    },
  })
}

export function useDeleteAllRecordings(slug: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: () => apiClient.del(`/workspaces/${slug}/recordings?all=true`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings', slug] })
    },
  })
}

export function useSaveRecording(slug: string) {
  const queryClient = useQueryClient()
  return useMutation<SaveRecordingResponse, Error & { status?: number }, { id: string; data: SaveRecordingInput }>({
    mutationFn: ({ id, data }) =>
      apiClient.post<SaveRecordingResponse>(`/workspaces/${slug}/recordings/${id}/save`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings', slug] })
      queryClient.invalidateQueries({ queryKey: ['workspaces', slug, 'endpoints'] })
    },
  })
}

export function useSaveRecordingsBulk(slug: string) {
  const queryClient = useQueryClient()
  return useMutation<SaveBulkResponse, Error, { ids: string[]; skipConflicts?: boolean }>({
    mutationFn: (body) =>
      apiClient.post<SaveBulkResponse>(`/workspaces/${slug}/recordings/save-bulk`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings', slug] })
      queryClient.invalidateQueries({ queryKey: ['workspaces', slug, 'endpoints'] })
    },
  })
}
