import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspaces } from '@web/hooks/use-workspaces'
import { WorkspaceCard } from '@web/components/workspace-card'
import { WorkspaceCreateDialog } from '@web/components/workspace-create-dialog'
import { Button } from '@web/components/ui/button'

export function WorkspaceList() {
  const navigate = useNavigate()
  const { data: workspaces = [], isLoading, isError } = useWorkspaces()
  const [createOpen, setCreateOpen] = useState(false)

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
        Erro ao carregar workspaces. Verifique se a API está rodando.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Novo workspace</Button>
      </div>

      {workspaces.length === 0 ? (
        <div className="rounded-lg border border-dashed border-input p-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum workspace criado ainda.</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            Criar primeiro workspace
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              onClick={() => navigate(`/workspaces/${ws.slug}/endpoints`)}
            />
          ))}
        </div>
      )}

      <WorkspaceCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
