import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useCreateEndpoint } from '@web/hooks/use-create-endpoint'
import { EndpointForm } from '@web/components/endpoint-form'
import { WorkspaceSelector } from '@web/components/workspace-selector'
import { useWorkspace } from '@web/hooks/use-workspaces'
import type { CreateEndpointInput, UpdateEndpointInput } from '@web/types/endpoint'

export function EndpointCreate() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { data: workspace } = useWorkspace(slug ?? '')
  const mutation = useCreateEndpoint(slug ?? '')

  if (!slug) return <Navigate to="/" replace />

  async function handleSubmit(data: CreateEndpointInput | UpdateEndpointInput) {
    await mutation.mutateAsync(data as CreateEndpointInput)
    navigate(`/workspaces/${slug}/endpoints`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <WorkspaceSelector workspaceName={workspace?.name ?? slug} proxyEnabled={workspace?.proxyEnabled} proxyUrl={workspace?.proxyUrl} />

      <div>
        <h1 className="text-xl font-semibold">Novo endpoint</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure o path, resposta e regras de matching.
        </p>
      </div>

      <EndpointForm
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/workspaces/${slug}/endpoints`)}
        isPending={mutation.isPending}
        isError={mutation.isError}
        errorMessage={mutation.error?.message}
        submitLabel="Criar endpoint"
      />
    </div>
  )
}
