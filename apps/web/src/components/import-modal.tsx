import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@web/components/ui/dialog'
import { Button } from '@web/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@web/components/ui/select'
import { ImportPreviewTable } from '@web/components/import-preview-table'
import { useImportPreview, useImportExecute } from '@web/hooks/use-import-endpoints'
import type { ExportFile, ImportPreviewResult, ImportStrategy } from '@web/types/import-export'

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
}

type ModalState = 'idle' | 'previewing' | 'importing' | 'done' | 'error'

export function ImportModal({ open, onOpenChange, slug }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [modalState, setModalState] = useState<ModalState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [parsedFile, setParsedFile] = useState<ExportFile | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [strategy, setStrategy] = useState<ImportStrategy>('skip')
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number } | null>(null)

  const previewMutation = useImportPreview(slug)
  const executeMutation = useImportExecute(slug)

  function resetState() {
    setModalState('idle')
    setErrorMessage('')
    setParsedFile(null)
    setPreview(null)
    setStrategy('skip')
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose(value: boolean) {
    if (!value) resetState()
    onOpenChange(value)
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result
      if (typeof text !== 'string') return

      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        setErrorMessage('Arquivo inválido: não é um JSON válido')
        setModalState('error')
        return
      }

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('endpoints' in parsed) ||
        !Array.isArray((parsed as Record<string, unknown>).endpoints)
      ) {
        setErrorMessage(
          'Arquivo inválido: formato não reconhecido. Use um arquivo exportado pelo StubLab',
        )
        setModalState('error')
        return
      }

      const exportFile = parsed as ExportFile
      setParsedFile(exportFile)

      try {
        const result = await previewMutation.mutateAsync(exportFile)
        setPreview(result)
        setModalState('previewing')
      } catch (err) {
        const message = (err as { message?: string })?.message ?? 'Erro ao processar o arquivo.'
        setErrorMessage(message)
        setModalState('error')
      }
    }

    reader.onerror = () => {
      setErrorMessage('Erro ao ler o arquivo.')
      setModalState('error')
    }

    reader.readAsText(file)
  }

  async function handleConfirmImport() {
    if (!parsedFile) return
    setModalState('importing')
    try {
      const result = await executeMutation.mutateAsync({ data: parsedFile, strategy })
      setImportResult(result)
      setModalState('done')
    } catch (err) {
      const message = (err as { message?: string })?.message ?? 'Erro ao importar endpoints.'
      setErrorMessage(message)
      setModalState('error')
    }
  }

  const confirmDisabled =
    preview !== null &&
    preview.summary.new === 0 &&
    preview.summary.conflict === 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar endpoints</DialogTitle>
          <DialogDescription>
            Selecione um arquivo .json exportado pelo StubLab para importar endpoints.
          </DialogDescription>
        </DialogHeader>

        {modalState === 'idle' && (
          <div className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-foreground mb-2">
                Selecione um arquivo .json exportado pelo StubLab
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
            </label>
          </div>
        )}

        {(modalState === 'previewing' || modalState === 'importing') && preview && parsedFile && (
          <div className="space-y-4">
            {parsedFile.workspace ? (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <span className="text-muted-foreground">Origem: </span>
                <span className="font-medium">{parsedFile.workspace.name}</span>
                <span className="text-muted-foreground font-mono ml-2">({parsedFile.workspace.slug})</span>
              </div>
            ) : (
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Arquivo legado (sem informação de workspace de origem)
              </div>
            )}

            <div className="flex gap-4 text-sm">
              <span className="rounded-full bg-green-100 px-3 py-1 text-green-800 font-medium">
                {preview.summary.new} novo{preview.summary.new !== 1 ? 's' : ''}
              </span>
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-800 font-medium">
                {preview.summary.conflict} conflito{preview.summary.conflict !== 1 ? 's' : ''}
              </span>
              <span className="rounded-full bg-red-100 px-3 py-1 text-red-800 font-medium">
                {preview.summary.invalid} inválido{preview.summary.invalid !== 1 ? 's' : ''}
              </span>
            </div>

            <ImportPreviewTable preview={preview.preview} />

            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Estratégia para conflitos
                </label>
                <Select
                  value={strategy}
                  onValueChange={(value) => setStrategy(value as ImportStrategy)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Ignorar existentes (padrão)</SelectItem>
                    <SelectItem value="overwrite">Sobrescrever existentes</SelectItem>
                    <SelectItem value="duplicate">Importar como novos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-6">
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={modalState === 'importing'}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={confirmDisabled || modalState === 'importing'}
                >
                  {modalState === 'importing' ? 'Importando...' : 'Confirmar importação'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {modalState === 'done' && importResult && (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              Importação concluída: {importResult.created} criado{importResult.created !== 1 ? 's' : ''},{' '}
              {importResult.updated} atualizado{importResult.updated !== 1 ? 's' : ''},{' '}
              {importResult.skipped} ignorado{importResult.skipped !== 1 ? 's' : ''}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)}>Fechar</Button>
            </div>
          </div>
        )}

        {modalState === 'error' && (
          <div className="space-y-4">
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={resetState}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
