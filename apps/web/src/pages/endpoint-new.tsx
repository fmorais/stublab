import { useNavigate } from 'react-router-dom'
import { EndpointForm } from '@web/components/endpoint-form'
import { useCreateEndpoint } from '@web/hooks/use-create-endpoint'
import type { CreateEndpointInput, UpdateEndpointInput } from '@web/types/endpoint'

export function EndpointNew() {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useCreateEndpoint()

  function handleSubmit(data: CreateEndpointInput | UpdateEndpointInput) {
    mutate(data as CreateEndpointInput, {
      onSuccess: () => navigate('/'),
    })
  }

  const errorMessage = error
    ? ((error as { code?: string }).code === 'CONFLICT'
        ? 'Já existe um endpoint ativo com esse método e path.'
        : error.message)
    : null

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Novo endpoint</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <EndpointForm
          onSubmit={handleSubmit}
          isLoading={isPending}
          error={errorMessage}
          submitLabel="Criar endpoint"
        />
      </div>
    </div>
  )
}
