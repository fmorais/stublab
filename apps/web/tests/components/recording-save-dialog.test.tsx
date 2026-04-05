import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RecordingSaveDialog } from '@web/components/recording-save-dialog'
import type { RecordedInteraction } from '@web/types/recording'

vi.mock('@web/hooks/use-recordings', () => ({
  useSaveRecording: vi.fn(),
}))

import { useSaveRecording } from '@web/hooks/use-recordings'

const recording: RecordedInteraction = {
  id: 'rec-1',
  workspaceId: 'ws-1',
  method: 'GET',
  path: '/api/users',
  requestHeaders: {},
  requestBody: null,
  responseStatus: 200,
  responseBody: '{"ok":true}',
  responseHeaders: {},
  capturedAt: '2026-01-01T00:00:00.000Z',
  groupKey: 'GET:/api/users',
  groupCount: 1,
}

function renderDialog(overrides: {
  open?: boolean
  recording?: RecordedInteraction | null
  onSaved?: () => void
} = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    recording: recording,
    onSaved: vi.fn(),
    slug: 'my-workspace',
    ...overrides,
  }
  return render(
    <QueryClientProvider client={qc}>
      <RecordingSaveDialog {...props} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  ;(useSaveRecording as ReturnType<typeof vi.fn>).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    reset: vi.fn(),
  })
})

describe('RecordingSaveDialog', () => {
  it('campos são pré-preenchidos com method + path', () => {
    renderDialog()

    const nameInput = screen.getByLabelText(/nome/i)
    expect(nameInput).toHaveValue('GET /api/users')

    const delayInput = screen.getByLabelText(/delay/i)
    expect(delayInput).toHaveValue(0)
  })

  it('exibe o path e status da gravação como readonly', () => {
    renderDialog()

    expect(screen.getByText('/api/users')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('submit chama useSaveRecording com os dados corretos', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue({})
    ;(useSaveRecording as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      reset: vi.fn(),
    })

    renderDialog()

    await user.click(screen.getByRole('button', { name: /salvar como mock/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledOnce()
      const args = mutateAsync.mock.calls[0][0]
      expect(args.id).toBe('rec-1')
      expect(args.data.name).toBe('GET /api/users')
    })
  })

  it('dialog de conflito aparece quando API retorna 409', async () => {
    const user = userEvent.setup()
    const conflictError = Object.assign(new Error('Conflict'), { status: 409 })
    const mutateAsync = vi.fn().mockRejectedValue(conflictError)
    ;(useSaveRecording as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      reset: vi.fn(),
    })

    renderDialog()

    await user.click(screen.getByRole('button', { name: /salvar como mock/i }))

    await waitFor(() => {
      expect(screen.getByText(/já existe um mock para/i)).toBeInTheDocument()
    })
  })

  it('botão sobrescrever chama useSaveRecording com overwrite=true', async () => {
    const user = userEvent.setup()
    const conflictError = Object.assign(new Error('Conflict'), { status: 409 })
    const mutateAsync = vi.fn()
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce({})

    ;(useSaveRecording as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      reset: vi.fn(),
    })

    renderDialog()

    await user.click(screen.getByRole('button', { name: /salvar como mock/i }))

    await waitFor(() => {
      expect(screen.getByText(/já existe um mock para/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /sobrescrever/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(2)
      const args = mutateAsync.mock.calls[1][0]
      expect(args.data.overwrite).toBe(true)
    })
  })
})
