import * as AlertDialog from '@radix-ui/react-alert-dialog'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  endpointName: string
  onConfirm: () => void
  isLoading?: boolean
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  endpointName,
  onConfirm,
  isLoading,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/40" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
          <AlertDialog.Title className="text-lg font-semibold text-gray-900">
            Deletar endpoint
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-600">
            Tem certeza que deseja deletar{' '}
            <span className="font-medium">"{endpointName}"</span>? Esta ação não pode ser desfeita.
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                disabled={isLoading}
              >
                Cancelar
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={onConfirm}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Deletando...' : 'Deletar'}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
