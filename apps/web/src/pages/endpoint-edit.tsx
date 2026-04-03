import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EndpointForm } from '@web/components/endpoint-form'
import { DeleteConfirmDialog } from '@web/components/delete-confirm-dialog'
import { useEndpoint } from '@web/hooks/use-endpoint'
import { useUpdateEndpoint } from '@web/hooks/use-update-endpoint'
import { useDeleteEndpoint } from '@web/hooks/use-delete-endpoint'
import type { UpdateEndpointInput, CreateEndpointInput } from '@web/types/endpoint'

export function EndpointEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)

  const { data: endpoint, isLoading, error: loadError } = useEndpoint(id!)
  const updateMutation = useUpdateEndpoint(id!)
  const deleteMutation = useDeleteEndpoint()

  function handleSubmit(data: CreateEndpointInput | UpdateEndpointInput) {
    updateMutation.mutate(data as UpdateEndpointInput, {
      onSuccess: () => navigate('/'),
    })
  }

  const updateError = updateMutation.error
    ? (((updateMutation.error as { code?: string }).code === 'CONFLICT')
        ? 'Já existe um endpoint ativo com esse método e path.'
        : updateMutation.error.message)
    : null

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-48 rounded bg-gray-100 animate-pulse" />
        <div className="h-96 rounded-lg bg-gray-100 animate-pulse" />
      </div>
    )
  }

  if (loadError || !endpoint) {
    return (
      <div className="max-w-2xl">
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar
        </button>
        <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Endpoint não encontrado.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Editar endpoint</h1>
          <p className="text-sm text-gray-500 mt-1">{endpoint.name}</p>
        </div>
        <button
          onClick={() => setShowDelete(true)}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 mt-6"
        >
          Deletar
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <EndpointForm
          defaultValues={endpoint}
          onSubmit={handleSubmit}
          isLoading={updateMutation.isPending}
          error={updateError}
          submitLabel="Salvar alterações"
        />
      </div>

      <DeleteConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        endpointName={endpoint.name}
        onConfirm={() => {
          deleteMutation.mutate(id!, {
            onSuccess: () => navigate('/'),
          })
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
