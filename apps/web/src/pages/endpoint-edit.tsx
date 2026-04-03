import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useEndpoint } from '@web/hooks/use-endpoints'
import { useUpdateEndpoint } from '@web/hooks/use-update-endpoint'
import { EndpointForm } from '@web/components/endpoint-form'
import type { UpdateEndpointInput, CreateEndpointInput } from '@web/types/endpoint'

export function EndpointEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) return <Navigate to="/" replace />

  const { data: endpoint, isLoading, isError } = useEndpoint(id)
  const mutation = useUpdateEndpoint()
  const resolvedId = id

  async function handleSubmit(data: CreateEndpointInput | UpdateEndpointInput) {
    await mutation.mutateAsync({ id: resolvedId, data: data as UpdateEndpointInput })
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (isError || !endpoint) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        Endpoint não encontrado.
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Editar endpoint</h1>
        <p className="text-sm text-muted-foreground mt-0.5 font-mono">
          {endpoint.method} {endpoint.path}
        </p>
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
        isPending={mutation.isPending}
        isError={mutation.isError}
        errorMessage={mutation.error?.message}
        submitLabel="Salvar alterações"
      />
    </div>
  )
}
