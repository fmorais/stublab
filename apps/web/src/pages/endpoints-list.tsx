import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEndpoints } from '@web/hooks/use-endpoints'
import { useDeleteEndpoint } from '@web/hooks/use-delete-endpoint'
import { useToggleEndpoint } from '@web/hooks/use-toggle-endpoint'
import { EndpointTable } from '@web/components/endpoint-table'
import { Button } from '@web/components/ui/button'
import type { Endpoint } from '@web/types/endpoint'

export function EndpointsList() {
  const navigate = useNavigate()
  const { data: endpoints = [], isLoading, isError } = useEndpoints()
  const deleteMutation = useDeleteEndpoint()
  const toggleMutation = useToggleEndpoint()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function handleToggle(endpoint: Endpoint) {
    setTogglingId(endpoint.id)
    try {
      await toggleMutation.mutateAsync(endpoint.id)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(endpoint: Endpoint) {
    if (!confirm(`Excluir "${endpoint.name}"?`)) return
    await deleteMutation.mutateAsync(endpoint.id)
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
        Erro ao carregar endpoints. Verifique se a API está rodando.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Endpoints</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} cadastrado{endpoints.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/endpoints/new')}>
          + Novo endpoint
        </Button>
      </div>

      <EndpointTable
        endpoints={endpoints}
        togglingId={togglingId}
        onEdit={(ep) => navigate(`/endpoints/${ep.id}/edit`)}
        onDelete={handleDelete}
        onToggleActive={handleToggle}
      />
    </div>
  )
}
