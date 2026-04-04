import { apiClient } from '@web/lib/api-client'
import type { ExportFile } from '@web/types/import-export'

function downloadJson(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useExportEndpoints(slug: string) {
  async function exportAll() {
    const data = await apiClient.get<ExportFile>(`/workspaces/${slug}/endpoints/export`)
    const date = new Date().toISOString().slice(0, 10)
    downloadJson(data, `stublab-export-${slug}-${date}.json`)
  }

  async function exportSelected(ids: string[]) {
    const data = await apiClient.get<ExportFile>(`/workspaces/${slug}/endpoints/export?ids=${ids.join(',')}`)
    const date = new Date().toISOString().slice(0, 10)
    downloadJson(data, `stublab-export-${slug}-${date}.json`)
  }

  return { exportAll, exportSelected }
}
