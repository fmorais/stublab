import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ImportModal } from '@web/components/import-modal'
import type { ImportPreviewResult } from '@web/types/import-export'

vi.mock('@web/hooks/use-import-endpoints', () => ({
  useImportPreview: vi.fn(),
  useImportExecute: vi.fn(),
}))

vi.mock('@web/components/import-preview-table', () => ({
  ImportPreviewTable: ({ preview }: { preview: unknown[] }) => (
    <div data-testid="preview-table">{preview.length} itens</div>
  ),
}))

import { useImportPreview, useImportExecute } from '@web/hooks/use-import-endpoints'

const mockPreviewResult: ImportPreviewResult = {
  valid: true,
  version: '1',
  totalInFile: 1,
  preview: [
    {
      index: 0,
      name: 'Listar users',
      method: 'GET',
      path: '/api/users',
      status: 'new',
      rulesCount: 0,
      errors: [],
    },
  ],
  summary: { new: 1, conflict: 0, invalid: 0 },
}

const mockFileReader = {
  readAsText: vi.fn(),
  onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
  onerror: null as (() => void) | null,
  result: '',
}

function buildFileContent(endpoints: unknown[] = []) {
  return JSON.stringify({
    version: '1',
    exportedAt: '2026-01-01T00:00:00.000Z',
    exportedBy: 'StubLab',
    count: endpoints.length,
    endpoints,
  })
}

function renderModal(props: { open?: boolean; onOpenChange?: (v: boolean) => void; slug?: string } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ImportModal open={props.open ?? true} onOpenChange={props.onOpenChange ?? vi.fn()} slug={props.slug ?? 'default'} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  mockFileReader.readAsText = vi.fn()
  mockFileReader.onload = null
  mockFileReader.onerror = null
  mockFileReader.result = ''

  vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as unknown as FileReader)

  ;(useImportPreview as ReturnType<typeof vi.fn>).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(mockPreviewResult),
    isPending: false,
  })

  ;(useImportExecute as ReturnType<typeof vi.fn>).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ created: 1, updated: 0, skipped: 0, errors: [] }),
    isPending: false,
  })
})

describe('ImportModal', () => {
  it('renderiza input de arquivo no estado idle', () => {
    renderModal()
    expect(screen.getByText('Importar endpoints')).toBeInTheDocument()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).not.toBeNull()
    expect(fileInput.accept).toBe('.json')
  })

  it('mostra erro quando arquivo não é JSON válido', async () => {
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['not json at all'], 'test.json', { type: 'application/json' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await act(async () => {
      mockFileReader.onload?.({
        target: { result: 'not json at all' },
      } as unknown as ProgressEvent<FileReader>)
    })

    await waitFor(() => {
      expect(screen.getByText(/não é um JSON válido/i)).toBeInTheDocument()
    })
  })

  it('mostra erro quando arquivo JSON não tem campo endpoints', async () => {
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const content = JSON.stringify({ version: '1', exportedAt: '2026-01-01T00:00:00.000Z' })
    const file = new File([content], 'test.json', { type: 'application/json' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await act(async () => {
      mockFileReader.onload?.({
        target: { result: content },
      } as unknown as ProgressEvent<FileReader>)
    })

    await waitFor(() => {
      expect(screen.getByText(/formato não reconhecido/i)).toBeInTheDocument()
    })
  })

  it('após upload válido exibe preview com dados retornados pelo hook', async () => {
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const content = buildFileContent([{ name: 'Listar users', method: 'GET', path: '/api/users' }])
    const file = new File([content], 'test.json', { type: 'application/json' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await act(async () => {
      mockFileReader.onload?.({
        target: { result: content },
      } as unknown as ProgressEvent<FileReader>)
    })

    await waitFor(() => {
      expect(screen.getByTestId('preview-table')).toBeInTheDocument()
    })

    expect(screen.getByText(/1 novo/i)).toBeInTheDocument()
  })

  it('botão "Confirmar" chama useImportExecute com a estratégia selecionada', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ created: 1, updated: 0, skipped: 0, errors: [] })
    ;(useImportExecute as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync,
      isPending: false,
    })

    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const content = buildFileContent([{ name: 'Listar users', method: 'GET', path: '/api/users' }])
    const file = new File([content], 'test.json', { type: 'application/json' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await act(async () => {
      mockFileReader.onload?.({
        target: { result: content },
      } as unknown as ProgressEvent<FileReader>)
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledOnce()
      const args = mutateAsync.mock.calls[0][0]
      expect(args).toMatchObject({ strategy: 'skip' })
      expect(args.data).toBeDefined()
      expect(Array.isArray(args.data.endpoints)).toBe(true)
    })
  })

  it('após import bem-sucedido exibe banner com contagem created/updated/skipped', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ created: 3, updated: 1, skipped: 2, errors: [] })
    ;(useImportExecute as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync,
      isPending: false,
    })

    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const content = buildFileContent([{ name: 'Listar users', method: 'GET', path: '/api/users' }])
    const file = new File([content], 'test.json', { type: 'application/json' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await act(async () => {
      mockFileReader.onload?.({
        target: { result: content },
      } as unknown as ProgressEvent<FileReader>)
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(screen.getByText(/importação concluída/i)).toBeInTheDocument()
    })

    const banner = screen.getByText(/importação concluída/i).closest('div') as HTMLElement
    expect(banner.textContent).toMatch(/3 criados/)
    expect(banner.textContent).toMatch(/1 atualizado/)
    expect(banner.textContent).toMatch(/2 ignorados/)
  })

  it('mostra erro quando FileReader falha ao ler o arquivo', async () => {
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'test.json', { type: 'application/json' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await act(async () => {
      mockFileReader.onerror?.()
    })

    await waitFor(() => {
      expect(screen.getByText(/erro ao ler o arquivo/i)).toBeInTheDocument()
    })
  })
})
