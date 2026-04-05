import { useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { useWorkspace } from '@web/hooks/use-workspaces'
import {
  useRecordings,
  useDeleteRecording,
  useDiscardRecordings,
  useDeleteAllRecordings,
  useSaveRecordingsBulk,
} from '@web/hooks/use-recordings'
import { WorkspaceSelector } from '@web/components/workspace-selector'
import { RecordingTable } from '@web/components/recording-table'
import { RecordingDetailDialog } from '@web/components/recording-detail-dialog'
import { RecordingSaveDialog } from '@web/components/recording-save-dialog'
import { RecordingBulkActions } from '@web/components/recording-bulk-actions'
import { Button } from '@web/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@web/components/ui/dialog'
import type { RecordedInteraction } from '@web/types/recording'

const PAGE_SIZE = 20

export function RecordingsList() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [methodFilter, setMethodFilter] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [detailRecording, setDetailRecording] = useState<RecordedInteraction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [saveRecording, setSaveRecording] = useState<RecordedInteraction | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [clearAllOpen, setClearAllOpen] = useState(false)

  const { data: workspace } = useWorkspace(slug ?? '')
  const { data, isLoading, isError } = useRecordings(slug ?? '', {
    method: methodFilter || undefined,
    search: search || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const deleteMutation = useDeleteRecording(slug ?? '')
  const discardMutation = useDiscardRecordings(slug ?? '')
  const deleteAllMutation = useDeleteAllRecordings(slug ?? '')
  const bulkSaveMutation = useSaveRecordingsBulk(slug ?? '')

  if (!slug) return <Navigate to="/" replace />

  const recordings = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  function handleView(recording: RecordedInteraction) {
    setDetailRecording(recording)
    setDetailOpen(true)
  }

  async function handleDiscard(id: string) {
    await deleteMutation.mutateAsync(id)
    setSelectedIds((prev) => prev.filter((s) => s !== id))
  }

  function handleSave(recording: RecordedInteraction) {
    setSaveRecording(recording)
    setSaveOpen(true)
  }

  async function handleBulkDiscard() {
    await discardMutation.mutateAsync({ ids: selectedIds })
    setSelectedIds([])
  }

  async function handleBulkSave() {
    await bulkSaveMutation.mutateAsync({ ids: selectedIds })
    setSelectedIds([])
  }

  async function handleDeleteAll() {
    await deleteAllMutation.mutateAsync()
    setSelectedIds([])
    setClearAllOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar gravações. Verifique se a API está rodando.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <WorkspaceSelector
        workspaceName={workspace?.name ?? slug}
        proxyEnabled={workspace?.proxyEnabled}
        proxyUrl={workspace?.proxyUrl}
        recordEnabled={workspace?.recordEnabled}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Gravações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} gravação{total !== 1 ? 'ões' : ''} capturada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/workspaces/${slug}/endpoints`)}
          >
            Ver endpoints
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClearAllOpen(true)}
            disabled={total === 0}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Limpar tudo
          </Button>
        </div>
      </div>

      {workspace && !workspace.recordEnabled && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          Record mode não está ativo. Ative nas configurações do workspace.
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          value={methodFilter}
          onChange={(e) => {
            setMethodFilter(e.target.value)
            setOffset(0)
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filtrar por método"
        >
          <option value="">Todos os métodos</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          type="text"
          placeholder="Buscar por path..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOffset(0)
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-64"
        />
      </div>

      <RecordingBulkActions
        selectedCount={selectedIds.length}
        onDiscard={handleBulkDiscard}
        onSave={handleBulkSave}
        disabled={discardMutation.isPending || bulkSaveMutation.isPending}
      />

      <RecordingTable
        recordings={recordings}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onView={handleView}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      <RecordingDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        recording={detailRecording}
      />

      <RecordingSaveDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        recording={saveRecording}
        onSaved={() => setSelectedIds([])}
        slug={slug}
      />

      <Dialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Limpar todas as gravações</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover todas as {total} gravações? Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearAllOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending ? 'Limpando...' : 'Limpar tudo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
