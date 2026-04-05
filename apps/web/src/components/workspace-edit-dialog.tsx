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
import { Switch } from '@web/components/ui/switch'
import { Alert, AlertDescription } from '@web/components/ui/alert'
import { useUpdateWorkspace } from '@web/hooks/use-workspaces'
import { useProxyConfig } from '@web/hooks/use-proxy-config'
import type { WorkspaceWithStats } from '@web/types/workspace'

interface WorkspaceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: WorkspaceWithStats
  onUpdated?: (newSlug: string) => void
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const URL_REGEX = /^https?:\/\/[^/\s]+$/

export function WorkspaceEditDialog({ open, onOpenChange, workspace, onUpdated }: WorkspaceEditDialogProps) {
  const [name, setName] = useState(workspace.name)
  const [slug, setSlug] = useState(workspace.slug)
  const [proxyEnabled, setProxyEnabled] = useState(workspace.proxyEnabled ?? false)
  const [proxyUrl, setProxyUrl] = useState(workspace.proxyUrl ?? '')
  const [recordEnabled, setRecordEnabled] = useState(workspace.recordEnabled ?? false)
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})
  const [proxyUrlError, setProxyUrlError] = useState<string | undefined>(undefined)
  const mutation = useUpdateWorkspace()
  const proxyConfig = useProxyConfig()

  const slugChanged = slug !== workspace.slug

  useEffect(() => {
    if (open) {
      setName(workspace.name)
      setSlug(workspace.slug)
      setProxyEnabled(workspace.proxyEnabled ?? false)
      setProxyUrl(workspace.proxyUrl ?? '')
      setRecordEnabled(workspace.recordEnabled ?? false)
      setErrors({})
      setProxyUrlError(undefined)
      mutation.reset()
    }
  }, [open, workspace])

  function handleClose(value: boolean) {
    if (!value) {
      setName(workspace.name)
      setSlug(workspace.slug)
      setProxyEnabled(workspace.proxyEnabled ?? false)
      setProxyUrl(workspace.proxyUrl ?? '')
      setRecordEnabled(workspace.recordEnabled ?? false)
      setErrors({})
      setProxyUrlError(undefined)
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

    let urlError: string | undefined
    if (proxyEnabled) {
      if (!proxyUrl.trim()) {
        urlError = 'URL é obrigatória quando proxy está ativo'
      } else if (!URL_REGEX.test(proxyUrl.trim())) {
        urlError = 'URL inválida. Use o formato https://api.example.com sem path'
      }
    }
    setProxyUrlError(urlError)

    return Object.keys(next).length === 0 && !urlError
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    try {
      await mutation.mutateAsync({
        slug: workspace.slug,
        data: {
          name: name.trim(),
          slug,
          proxyEnabled,
          proxyUrl: proxyUrl.trim() || null,
          recordEnabled,
        },
      })
      handleClose(false)
      onUpdated?.(slug)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === 'SLUG_CONFLICT') {
        setErrors({ slug: 'Esse slug já está em uso' })
      } else if (code === 'VALIDATION_ERROR') {
        // recordEnabled sem proxy ativo — nenhuma ação extra necessária; a mensagem
        // de erro geral do mutation.isError abaixo já será exibida
      }
    }
  }

  const proxyGloballyDisabled = proxyConfig.data !== undefined && !proxyConfig.data.globallyEnabled

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

          <div className="space-y-3 border-t pt-4 mt-2">
            <h4 className="text-sm font-medium">Proxy Mode</h4>

            {proxyConfig.data && !proxyConfig.data.globallyEnabled && (
              <Alert>
                <AlertDescription>
                  Proxy mode desativado globalmente pelo administrador
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="proxy-enabled"
                checked={proxyEnabled}
                onCheckedChange={setProxyEnabled}
                disabled={proxyGloballyDisabled}
              />
              <Label htmlFor="proxy-enabled" className="text-sm">
                Encaminhar requests sem mock para serviço real
              </Label>
            </div>

            {(proxyEnabled || proxyGloballyDisabled) && (
              <div className="space-y-1.5">
                <Label htmlFor="proxy-url">URL base do serviço</Label>
                <Input
                  id="proxy-url"
                  placeholder="https://api.meuservico.com.br"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                />
                {proxyUrlError && (
                  <p className="text-sm text-destructive">{proxyUrlError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Requests sem endpoint mockado serão encaminhadas para esta URL
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-4 mt-2">
            <h4 className="text-sm font-medium">Record Mode</h4>

            <div className="flex items-center gap-2">
              <Switch
                id="record-enabled"
                checked={recordEnabled}
                onCheckedChange={setRecordEnabled}
                disabled={!proxyEnabled || proxyGloballyDisabled}
              />
              <Label htmlFor="record-enabled" className="text-sm">
                Gravar interações proxiadas para revisão
              </Label>
            </div>

            {(!proxyEnabled || proxyGloballyDisabled) && (
              <p className="text-xs text-muted-foreground">
                Ative o proxy mode primeiro para habilitar gravação
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
