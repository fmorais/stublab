import { useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useEndpoints } from '@web/hooks/use-endpoints'
import { useDeleteEndpoint } from '@web/hooks/use-delete-endpoint'
import { useToggleEndpoint } from '@web/hooks/use-toggle-endpoint'
import { useExportEndpoints } from '@web/hooks/use-export-endpoints'
import { useWorkspace } from '@web/hooks/use-workspaces'
import { EndpointTable } from '@web/components/endpoint-table'
import { ImportModal } from '@web/components/import-modal'
import { WorkspaceSelector } from '@web/components/workspace-selector'
import { WorkspaceEditDialog } from '@web/components/workspace-edit-dialog'
import { WorkspaceDeleteDialog } from '@web/components/workspace-delete-dialog'
import { Button } from '@web/components/ui/button'
import type { Endpoint } from '@web/types/endpoint'

export function EndpointsList() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const { data: workspace, isLoading: wsLoading } = useWorkspace(slug ?? '')
  const { data: endpoints = [], isLoading, isError } = useEndpoints(slug ?? '')
  const deleteMutation = useDeleteEndpoint(slug ?? '')
  const toggleMutation = useToggleEndpoint(slug ?? '')
  const { exportAll, exportSelected } = useExportEndpoints(slug ?? '')

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!slug) return <Navigate to="/" replace />

  async function handleToggle(endpoint: Endpoint) {
    setTogglingId(endpoint.id)
    setToggleError(null)
    try {
      await toggleMutation.mutateAsync(endpoint.id)
    } catch (err) {
      const message = (err as { message?: string })?.message ?? 'Erro ao alterar status do endpoint.'
      setToggleError(message)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(endpoint: Endpoint) {
    if (!confirm(`Excluir "${endpoint.name}"?`)) return
    await deleteMutation.mutateAsync(endpoint.id)
  }

  if (isLoading || wsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar endpoints. Verifique se a API está rodando.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <WorkspaceSelector workspaceName={workspace?.name ?? slug} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Endpoints</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} cadastrado{endpoints.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {workspace && workspace.slug !== 'default' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                Editar workspace
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                Excluir workspace
              </Button>
            </>
          )}
          <Button onClick={() => navigate(`/workspaces/${slug}/endpoints/new`)}>
            + Novo endpoint
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => exportAll()}>
          Exportar tudo
        </Button>
        {selectedIds.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportSelected(selectedIds)}>
            Exportar selecionados ({selectedIds.length})
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
          Importar
        </Button>
      </div>

      {toggleError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{toggleError}</span>
          <button type="button" onClick={() => setToggleError(null)} className="ml-4 text-red-400 hover:text-red-600 font-medium">✕</button>
        </div>
      )}

      <EndpointTable
        endpoints={endpoints}
        togglingId={togglingId}
        onEdit={(ep) => navigate(`/workspaces/${slug}/endpoints/${ep.id}/edit`)}
        onDelete={handleDelete}
        onToggleActive={handleToggle}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <ImportModal open={importModalOpen} onOpenChange={setImportModalOpen} slug={slug} />

      {workspace && (
        <>
          <WorkspaceEditDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            workspace={workspace}
            onUpdated={(newSlug) => navigate(`/workspaces/${newSlug}/endpoints`, { replace: true })}
          />
          <WorkspaceDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            workspace={workspace}
          />
        </>
      )}
    </div>
  )
}
