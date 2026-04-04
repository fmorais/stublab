import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@web/components/ui/dialog'
import { Button } from '@web/components/ui/button'
import { useDeleteWorkspace } from '@web/hooks/use-workspaces'
import type { WorkspaceWithStats } from '@web/types/workspace'

interface WorkspaceDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: WorkspaceWithStats
}

export function WorkspaceDeleteDialog({ open, onOpenChange, workspace }: WorkspaceDeleteDialogProps) {
  const mutation = useDeleteWorkspace()

  function handleClose(value: boolean) {
    if (!value) mutation.reset()
    onOpenChange(value)
  }

  async function handleDelete() {
    await mutation.mutateAsync(workspace.slug)
    handleClose(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir workspace</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-foreground">
            Tem certeza que deseja excluir o workspace{' '}
            <span className="font-semibold">{workspace.name}</span>?
          </p>

          {workspace.endpointCount > 0 && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              Este workspace contém{' '}
              <span className="font-semibold">{workspace.endpointCount} endpoint{workspace.endpointCount !== 1 ? 's' : ''}</span>{' '}
              que também serão excluídos.
            </div>
          )}

          {mutation.isError && (
            <p className="text-xs text-red-600">
              {(mutation.error as { code?: string })?.code === 'DEFAULT_WORKSPACE_PROTECTED'
                ? 'O workspace padrão não pode ser excluído.'
                : mutation.error?.message ?? 'Erro ao excluir workspace'}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Excluindo...' : 'Excluir workspace'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
