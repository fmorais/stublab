import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@web/components/ui/dialog'
import { Button } from '@web/components/ui/button'

interface RecordingBulkActionsProps {
  selectedCount: number
  onDiscard: () => void
  onSave: () => void
  disabled?: boolean
}

export function RecordingBulkActions({
  selectedCount,
  onDiscard,
  onSave,
  disabled,
}: RecordingBulkActionsProps) {
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  if (selectedCount === 0) return null

  return (
    <>
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
        <span className="text-sm text-muted-foreground">
          {selectedCount} {selectedCount === 1 ? 'selecionado' : 'selecionados'}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmDiscardOpen(true)}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Descartar selecionados ({selectedCount})
        </Button>
        <Button variant="outline" size="sm" onClick={onSave} disabled={disabled}>
          Salvar selecionados como mocks ({selectedCount})
        </Button>
      </div>

      <Dialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar descarte</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja descartar {selectedCount}{' '}
              {selectedCount === 1 ? 'gravação selecionada' : 'gravações selecionadas'}? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscardOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDiscardOpen(false)
                onDiscard()
              }}
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
