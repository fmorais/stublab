import { useNavigate } from 'react-router-dom'
import { useCreateEndpoint } from '@web/hooks/use-create-endpoint'
import { EndpointForm } from '@web/components/endpoint-form'
import type { CreateEndpointInput, UpdateEndpointInput } from '@web/types/endpoint'

export function EndpointCreate() {
  const navigate = useNavigate()
  const mutation = useCreateEndpoint()

  async function handleSubmit(data: CreateEndpointInput | UpdateEndpointInput) {
    await mutation.mutateAsync(data as CreateEndpointInput)
    navigate('/')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Novo endpoint</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure o path, resposta e regras de matching.
        </p>
      </div>

      <EndpointForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/')}
        isPending={mutation.isPending}
        isError={mutation.isError}
        errorMessage={mutation.error?.message}
        submitLabel="Criar endpoint"
      />
    </div>
  )
}
