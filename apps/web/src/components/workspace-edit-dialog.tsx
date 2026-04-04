import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@web/components/ui/dialog'
import { Button } from '@web/components/ui/button'
import { Input } from '@web/components/ui/input'
import { Label } from '@web/components/ui/label'
import { useUpdateWorkspace } from '@web/hooks/use-workspaces'
import type { WorkspaceWithStats } from '@web/types/workspace'

interface WorkspaceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: WorkspaceWithStats
  onUpdated?: (newSlug: string) => void
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function WorkspaceEditDialog({ open, onOpenChange, workspace, onUpdated }: WorkspaceEditDialogProps) {
  const [name, setName] = useState(workspace.name)
  const [slug, setSlug] = useState(workspace.slug)
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})
  const mutation = useUpdateWorkspace()

  const slugChanged = slug !== workspace.slug

  useEffect(() => {
    if (open) {
      setName(workspace.name)
      setSlug(workspace.slug)
      setErrors({})
      mutation.reset()
    }
  }, [open, workspace])

  function handleClose(value: boolean) {
    if (!value) {
      setName(workspace.name)
      setSlug(workspace.slug)
      setErrors({})
      mutation.reset()
    }
    onOpenChange(value)
  }

  function validate(): boolean {
    const next: { name?: string; slug?: string } = {}
    if (!name.trim()) next.name = 'Nome é obrigatório'
    if (!slug) next.slug = 'Slug é obrigatório'
    else if (!SLUG_REGEX.test(slug)) next.slug = 'Slug deve conter apenas letras minúsculas, números e hífens'
    else if (slug.length < 2) next.slug = 'Slug deve ter pelo menos 2 caracteres'
    else if (slug.length > 50) next.slug = 'Slug deve ter no máximo 50 caracteres'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    try {
      await mutation.mutateAsync({ slug: workspace.slug, data: { name: name.trim(), slug } })
      handleClose(false)
      onUpdated?.(slug)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === 'SLUG_CONFLICT') {
        setErrors({ slug: 'Esse slug já está em uso' })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar workspace</DialogTitle>
          <DialogDescription>
            Atualize as informações do workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-ws-name">Nome</Label>
            <Input
              id="edit-ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-ws-slug">Slug</Label>
            <Input
              id="edit-ws-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="font-mono"
            />
            {errors.slug && <p className="text-xs text-red-600">{errors.slug}</p>}
            {slugChanged && !errors.slug && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5">
                Atenção: alterar o slug vai quebrar URLs existentes que apontam para este workspace.
              </p>
            )}
          </div>

          {mutation.isError && !errors.slug && (
            <p className="text-xs text-red-600">
              {mutation.error?.message ?? 'Erro ao atualizar workspace'}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
