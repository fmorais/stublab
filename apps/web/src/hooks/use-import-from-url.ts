import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@web/lib/api-client'
import type { FetchUrlResponse } from '@web/types/import-external'

export function useImportFromUrl(slug: string) {
  return useMutation<FetchUrlResponse, Error, string>({
    mutationFn: (url) =>
      apiClient.post<FetchUrlResponse>(`/workspaces/${slug}/endpoints/import/from-url`, { url }),
  })
}
