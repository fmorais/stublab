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
import { useCreateWorkspace } from '@web/hooks/use-workspaces'

interface WorkspaceCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function WorkspaceCreateDialog({ open, onOpenChange }: WorkspaceCreateDialogProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})
  const mutation = useCreateWorkspace()

  useEffect(() => {
    if (!slugEdited) {
      setSlug(toSlug(name))
    }
  }, [name, slugEdited])

  function handleClose(value: boolean) {
    if (!value) {
      setName('')
      setSlug('')
      setSlugEdited(false)
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
      await mutation.mutateAsync({ name: name.trim(), slug })
      handleClose(false)
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
          <DialogTitle>Novo workspace</DialogTitle>
          <DialogDescription>
            Crie um workspace para organizar seus endpoints de mock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Nome</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meu projeto"
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ws-slug">Slug</Label>
            <Input
              id="ws-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setSlugEdited(true)
              }}
              placeholder="meu-projeto"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Usado na URL: /mock/<span className="font-mono">{slug || '...'}</span>/seu-path
            </p>
            {errors.slug && <p className="text-xs text-red-600">{errors.slug}</p>}
          </div>

          {mutation.isError && !errors.slug && (
            <p className="text-xs text-red-600">
              {mutation.error?.message ?? 'Erro ao criar workspace'}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Criando...' : 'Criar workspace'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
