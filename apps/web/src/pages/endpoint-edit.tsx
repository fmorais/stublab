import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useEndpoint } from '@web/hooks/use-endpoints'
import { useUpdateEndpoint } from '@web/hooks/use-update-endpoint'
import { useDeleteEndpoint } from '@web/hooks/use-delete-endpoint'
import { useWorkspace } from '@web/hooks/use-workspaces'
import { EndpointForm } from '@web/components/endpoint-form'
import { WorkspaceSelector } from '@web/components/workspace-selector'
import type { UpdateEndpointInput, CreateEndpointInput } from '@web/types/endpoint'

export function EndpointEdit() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const navigate = useNavigate()
  const { data: workspace } = useWorkspace(slug ?? '')
  const { data: endpoint, isLoading, isError: loadError } = useEndpoint(slug ?? '', id ?? '')
  const updateMutation = useUpdateEndpoint(slug ?? '')
  const deleteMutation = useDeleteEndpoint(slug ?? '')

  if (!slug || !id) return <Navigate to="/" replace />

  const safeId: string = id

  async function handleSubmit(data: CreateEndpointInput | UpdateEndpointInput) {
    await updateMutation.mutateAsync({ id: safeId, data: data as UpdateEndpointInput })
    navigate(`/workspaces/${slug}/endpoints`)
  }

  async function handleDelete() {
    if (!confirm(`Tem certeza que deseja deletar "${endpoint?.name}"?`)) return
    await deleteMutation.mutateAsync(safeId)
    navigate(`/workspaces/${slug}/endpoints`)
  }

  const errorMessage = updateMutation.error
    ? ((updateMutation.error as { code?: string }).code === 'CONFLICT'
        ? 'Já existe um endpoint ativo com esse método e path.'
        : updateMutation.error.message)
    : undefined

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="h-64 rounded bg-gray-200" />
      </div>
    )
  }

  if (loadError || !endpoint) {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-red-600">Endpoint não encontrado.</p>
        <button
          type="button"
          onClick={() => navigate(`/workspaces/${slug}/endpoints`)}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <WorkspaceSelector workspaceName={workspace?.name ?? slug} proxyEnabled={workspace?.proxyEnabled} proxyUrl={workspace?.proxyUrl} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Editar endpoint</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">
            {endpoint.method} {endpoint.path}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="rounded px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleteMutation.isPending ? 'Deletando...' : 'Deletar'}
        </button>
      </div>

      <EndpointForm
        defaultValues={{
          name: endpoint.name,
          method: endpoint.method,
          path: endpoint.path,
          responseStatus: endpoint.responseStatus,
          responseBody: endpoint.responseBody,
          delay: endpoint.delay,
          matchingRules: endpoint.matchingRules,
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/workspaces/${slug}/endpoints`)}
        isPending={updateMutation.isPending}
        isError={!!updateMutation.error}
        errorMessage={errorMessage}
        submitLabel="Salvar alterações"
      />
    </div>
  )
}
