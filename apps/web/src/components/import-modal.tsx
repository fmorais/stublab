import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@web/components/ui/dialog'
import { Button } from '@web/components/ui/button'
import { Input } from '@web/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@web/components/ui/select'
import { ImportPreviewTable } from '@web/components/import-preview-table'
import { ImportSourceSelector } from '@web/components/import-source-selector'
import { useImportPreview, useImportExecute } from '@web/hooks/use-import-endpoints'
import { useImportFromUrl } from '@web/hooks/use-import-from-url'
import { parseYaml } from '@web/lib/yaml-parser'
import type { ExportFile, ImportPreviewResult, ImportStrategy, ExportedEndpoint } from '@web/types/import-export'
import type { ImportSource } from '@web/types/import-external'

const MAX_FILE_SIZE = 10 * 1024 * 1024

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
}

type ModalState =
  | 'selecting-source'
  | 'uploading'
  | 'loading-url'
  | 'previewing'
  | 'importing'
  | 'done'
  | 'error'

type OpenApiTab = 'file' | 'url'

const DESCRIPTION: Record<ImportSource, string> = {
  stublab: 'Selecione um arquivo .json exportado pelo StubLab para importar endpoints.',
  postman: 'Selecione uma coleção Postman (.json) v2.x para importar endpoints.',
  openapi: 'Selecione uma spec Swagger/OpenAPI (.json ou .yaml) ou informe a URL pública.',
}

export function ImportModal({ open, onOpenChange, slug }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [modalState, setModalState] = useState<ModalState>('selecting-source')
  const [source, setSource] = useState<ImportSource>('stublab')
  const [activeTab, setActiveTab] = useState<OpenApiTab>('file')
  const [urlInput, setUrlInput] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [parsedFile, setParsedFile] = useState<ExportFile | null>(null)
  const [parsedEndpoints, setParsedEndpoints] = useState<ExportedEndpoint[]>([])
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [strategy, setStrategy] = useState<ImportStrategy>('skip')
  const [importResult, setImportResult] = useState<{
    created: number
    updated: number
    skipped: number
  } | null>(null)

  const previewMutation = useImportPreview(slug)
  const executeMutation = useImportExecute(slug)
  const fromUrlMutation = useImportFromUrl(slug)

  function resetState() {
    setModalState('selecting-source')
    setSource('stublab')
    setActiveTab('file')
    setUrlInput('')
    setErrorMessage('')
    setParsedFile(null)
    setParsedEndpoints([])
    setPreview(null)
    setStrategy('skip')
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose(value: boolean) {
    if (!value) resetState()
    onOpenChange(value)
  }

  function handleContinueToUpload() {
    setModalState('uploading')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function runPreview(rawData: unknown, importSource: ImportSource) {
    try {
      const result = await previewMutation.mutateAsync({ source: importSource, data: rawData })
      setPreview(result)
      if (result.endpoints) {
        setParsedEndpoints(result.endpoints)
      }
      setModalState('previewing')
    } catch (err) {
      const message = (err as { message?: string })?.message ?? 'Erro ao processar o arquivo.'
      setErrorMessage(message)
      setModalState('error')
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('Arquivo muito grande: o limite é 10 MB.')
      setModalState('error')
      return
    }

    const reader = new FileReader()

    reader.onload = async (e) => {
      const text = e.target?.result
      if (typeof text !== 'string') return

      if (source === 'stublab') {
        let parsed: unknown
        try {
          parsed = JSON.parse(text)
        } catch {
          setErrorMessage('Arquivo inválido: não é um JSON válido.')
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
            'Arquivo inválido: formato não reconhecido. Use um arquivo exportado pelo StubLab.',
          )
          setModalState('error')
          return
        }

        const exportFile = parsed as ExportFile
        setParsedFile(exportFile)
        await runPreview(exportFile, 'stublab')
        return
      }

      if (source === 'postman') {
        let parsed: unknown
        try {
          parsed = JSON.parse(text)
        } catch {
          setErrorMessage('Arquivo inválido: não é um JSON válido.')
          setModalState('error')
          return
        }
        await runPreview(parsed, 'postman')
        return
      }

      if (source === 'openapi') {
        const isYaml =
          file.name.endsWith('.yaml') || file.name.endsWith('.yml')
        let parsed: unknown
        try {
          parsed = isYaml ? parseYaml(text) : JSON.parse(text)
        } catch (err) {
          const message = (err as { message?: string })?.message ?? 'Arquivo inválido.'
          setErrorMessage(message)
          setModalState('error')
          return
        }
        await runPreview(parsed, 'openapi')
      }
    }

    reader.onerror = () => {
      setErrorMessage('Erro ao ler o arquivo.')
      setModalState('error')
    }

    reader.readAsText(file)
  }

  async function handleLoadUrl() {
    const trimmed = urlInput.trim()
    if (!trimmed) return

    setModalState('loading-url')
    try {
      const response = await fromUrlMutation.mutateAsync(trimmed)
      await runPreview(response.data, 'openapi')
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? 'Erro ao carregar a URL.'
      setErrorMessage(message)
      setModalState('error')
    }
  }

  async function handleConfirmImport() {
    setModalState('importing')

    let exportFile: ExportFile

    if (source === 'stublab' && parsedFile) {
      exportFile = parsedFile
    } else {
      exportFile = {
        version: '2',
        exportedAt: new Date().toISOString(),
        exportedBy: source === 'postman' ? 'Postman' : 'OpenAPI',
        count: parsedEndpoints.length,
        endpoints: parsedEndpoints,
      }
    }

    try {
      const result = await executeMutation.mutateAsync({ data: exportFile, strategy })
      setImportResult(result)
      setModalState('done')
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? 'Erro ao importar endpoints.'
      setErrorMessage(message)
      setModalState('error')
    }
  }

  const confirmDisabled =
    preview !== null &&
    preview.summary.new === 0 &&
    preview.summary.conflict === 0

  const fileAccept =
    source === 'openapi' ? '.json,.yaml,.yml' : '.json'

  const isLoadingUrl = modalState === 'loading-url'
  const isUploading = modalState === 'uploading' && (previewMutation.isPending || fromUrlMutation.isPending)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar endpoints</DialogTitle>
          <DialogDescription>
            {DESCRIPTION[source]}
          </DialogDescription>
        </DialogHeader>

        {modalState === 'selecting-source' && (
          <div className="space-y-6">
            <ImportSourceSelector value={source} onChange={setSource} />
            <div className="flex justify-end">
              <Button onClick={handleContinueToUpload}>Continuar</Button>
            </div>
          </div>
        )}

        {(modalState === 'uploading' || isLoadingUrl) && (
          <div className="space-y-4">
            {source === 'stublab' && (
              <label className="block">
                <span className="block text-sm font-medium text-foreground mb-2">
                  Selecione um arquivo .json exportado pelo StubLab
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </label>
            )}

            {source === 'postman' && (
              <label className="block">
                <span className="block text-sm font-medium text-foreground mb-2">
                  Selecione uma coleção Postman (.json)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </label>
            )}

            {source === 'openapi' && (
              <div className="space-y-4">
                <div className="flex gap-2 border-b border-input">
                  <button
                    type="button"
                    onClick={() => setActiveTab('file')}
                    className={[
                      'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                      activeTab === 'file'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    Arquivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('url')}
                    className={[
                      'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                      activeTab === 'url'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    URL
                  </button>
                </div>

                {activeTab === 'file' && (
                  <label className="block">
                    <span className="block text-sm font-medium text-foreground mb-2">
                      Selecione uma spec OpenAPI (.json, .yaml ou .yml)
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={fileAccept}
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </label>
                )}

                {activeTab === 'url' && (
                  <div className="space-y-2">
                    <label
                      htmlFor="openapi-url-input"
                      className="block text-sm font-medium text-foreground"
                    >
                      URL da spec OpenAPI
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="openapi-url-input"
                        type="url"
                        placeholder="https://exemplo.com/api-docs/openapi.json"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleLoadUrl()
                        }}
                        disabled={isLoadingUrl}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleLoadUrl}
                        disabled={!urlInput.trim() || isLoadingUrl}
                      >
                        {isLoadingUrl ? 'Carregando...' : 'Carregar'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isUploading && (
              <p className="text-sm text-muted-foreground">Processando arquivo...</p>
            )}

            <div className="flex justify-start pt-1">
              <Button
                variant="outline"
                onClick={() => setModalState('selecting-source')}
                disabled={isUploading || isLoadingUrl}
              >
                Voltar
              </Button>
            </div>
          </div>
        )}

        {(modalState === 'previewing' || modalState === 'importing') && preview && (
          <div className="space-y-4">
            {source === 'stublab' && parsedFile && (
              parsedFile.workspace ? (
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Origem: </span>
                  <span className="font-medium">{parsedFile.workspace.name}</span>
                  <span className="text-muted-foreground font-mono ml-2">
                    ({parsedFile.workspace.slug})
                  </span>
                </div>
              ) : (
                <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Arquivo legado (sem informação de workspace de origem)
                </div>
              )
            )}

            {source !== 'stublab' && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Origem: {source === 'postman' ? 'Postman Collection' : 'Swagger/OpenAPI'}
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

            <ImportPreviewTable
              preview={preview.preview}
              endpoints={preview.endpoints}
            />

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
              Importação concluída:{' '}
              {importResult.created} criado{importResult.created !== 1 ? 's' : ''},{' '}
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
