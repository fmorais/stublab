import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useEndpoint } from '@web/hooks/use-endpoint'
import { useUpdateEndpoint } from '@web/hooks/use-update-endpoint'
import { useDeleteEndpoint } from '@web/hooks/use-delete-endpoint'
import { EndpointForm } from '@web/components/endpoint-form'
import type { UpdateEndpointInput, CreateEndpointInput } from '@web/types/endpoint'

export function EndpointEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) return <Navigate to="/" replace />

  const { data: endpoint, isLoading, isError: loadError } = useEndpoint(id)
  const updateMutation = useUpdateEndpoint()
  const deleteMutation = useDeleteEndpoint()

  async function handleSubmit(data: CreateEndpointInput | UpdateEndpointInput) {
    await updateMutation.mutateAsync({ id, data: data as UpdateEndpointInput })
    navigate('/')
  }

  async function handleDelete() {
    if (!confirm(`Tem certeza que deseja deletar "${endpoint?.name}"?`)) return
    await deleteMutation.mutateAsync(id)
    navigate('/')
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
          onClick={() => navigate('/')}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
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
        onCancel={() => navigate('/')}
        isPending={updateMutation.isPending}
        isError={!!updateMutation.error}
        errorMessage={errorMessage}
        submitLabel="Salvar alterações"
      />
    </div>
  )
}
