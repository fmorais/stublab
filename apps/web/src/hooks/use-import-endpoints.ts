import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@web/lib/api-client'
import type { ExportFile, ImportPreviewResult, ImportResult, ImportStrategy } from '@web/types/import-export'

export function useImportPreview(slug: string) {
  return useMutation<ImportPreviewResult, Error, ExportFile>({
    mutationFn: (data) =>
      apiClient.post<ImportPreviewResult>(`/workspaces/${slug}/endpoints/import/preview`, { data }),
  })
}

export function useImportExecute(slug: string) {
  const queryClient = useQueryClient()
  return useMutation<ImportResult, Error, { data: ExportFile; strategy: ImportStrategy }>({
    mutationFn: ({ data, strategy }) =>
      apiClient.post<ImportResult>(`/workspaces/${slug}/endpoints/import`, { data, strategy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', slug, 'endpoints'] })
      queryClient.invalidateQueries({ queryKey: ['workspaces', slug] })
    },
  })
}
