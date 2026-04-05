import { useState, useEffect } from 'react'
import { cn } from '@web/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@web/components/ui/dialog'
import { Button } from '@web/components/ui/button'
import { Input } from '@web/components/ui/input'
import { Label } from '@web/components/ui/label'
import { useSaveRecording } from '@web/hooks/use-recordings'
import type { RecordedInteraction } from '@web/types/recording'

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-green-100 text-green-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  PATCH: 'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
}

function formatJson(value: unknown): string {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  if (value === null || value === undefined) return ''
  return JSON.stringify(value, null, 2)
}

interface RecordingSaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recording: RecordedInteraction | null
  onSaved: () => void
  slug: string
}

export function RecordingSaveDialog({
  open,
  onOpenChange,
  recording,
  onSaved,
  slug,
}: RecordingSaveDialogProps) {
  const [name, setName] = useState('')
  const [delay, setDelay] = useState(0)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)

  const saveMutation = useSaveRecording(slug)

  useEffect(() => {
    if (open && recording) {
      setName(`${recording.method} ${recording.path}`)
      setDelay(0)
      setConflictDialogOpen(false)
      saveMutation.reset()
    }
  }, [open, recording])

  if (!recording) return null

  async function handleSubmit(overwrite = false) {
    if (!recording) return
    try {
      await saveMutation.mutateAsync({
        id: recording.id,
        data: { name: name.trim() || undefined, delay, overwrite: overwrite || undefined },
      })
      onSaved()
      onOpenChange(false)
    } catch (err) {
      const status = (err as { status?: number })?.status
      if (status === 409) {
        setConflictDialogOpen(true)
      }
    }
  }

  return (
    <>
      <Dialog open={open && !conflictDialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Salvar gravação como mock</DialogTitle>
            <DialogDescription>
              Configure os detalhes do mock que será criado a partir desta gravação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="save-rec-name">Nome</Label>
              <Input
                id="save-rec-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="save-rec-delay">Delay (ms)</Label>
              <Input
                id="save-rec-delay"
                type="number"
                min={0}
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Método</Label>
                <div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold',
                      METHOD_STYLES[recording.method] ?? 'bg-gray-100 text-gray-800',
                    )}
                  >
                    {recording.method}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <p className="text-sm font-mono">{recording.responseStatus}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Path</Label>
              <p className="text-sm font-mono">{recording.path}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Response Body</Label>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                {recording.responseBody ? formatJson(recording.responseBody) : <span className="text-muted-foreground italic">vazio</span>}
              </pre>
            </div>

            {saveMutation.isError && !conflictDialogOpen && (
              <p className="text-sm text-destructive">
                {saveMutation.error?.message ?? 'Erro ao salvar mock'}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => handleSubmit(false)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar como mock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mock já existe</DialogTitle>
            <DialogDescription>
              Já existe um mock para {recording.method} {recording.path}. Deseja sobrescrever?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConflictDialogOpen(false)
                saveMutation.reset()
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setConflictDialogOpen(false)
                handleSubmit(true)
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Sobrescrevendo...' : 'Sobrescrever'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
