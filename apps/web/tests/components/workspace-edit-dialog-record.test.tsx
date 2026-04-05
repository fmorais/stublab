import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkspaceEditDialog } from '@web/components/workspace-edit-dialog'
import type { WorkspaceWithStats } from '@web/types/workspace'

vi.mock('@web/hooks/use-workspaces', () => ({
  useUpdateWorkspace: vi.fn(),
}))

vi.mock('@web/hooks/use-proxy-config', () => ({
  useProxyConfig: vi.fn(),
}))

import { useUpdateWorkspace } from '@web/hooks/use-workspaces'
import { useProxyConfig } from '@web/hooks/use-proxy-config'

const baseWorkspace: WorkspaceWithStats = {
  id: 'ws-1',
  name: 'Meu Workspace',
  slug: 'meu-workspace',
  proxyEnabled: false,
  proxyUrl: null,
  recordEnabled: false,
  endpointCount: 0,
  activeEndpointCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function renderDialog(workspaceOverrides: Partial<WorkspaceWithStats> = {}, open = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const workspace = { ...baseWorkspace, ...workspaceOverrides }
  return render(
    <QueryClientProvider client={qc}>
      <WorkspaceEditDialog
        open={open}
        onOpenChange={vi.fn()}
        workspace={workspace}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  ;(useUpdateWorkspace as ReturnType<typeof vi.fn>).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(baseWorkspace),
    isPending: false,
    isError: false,
    reset: vi.fn(),
  })

  ;(useProxyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { globallyEnabled: true, timeoutMs: 5000 },
  })
})

describe('WorkspaceEditDialog — seção de record mode', () => {
  it('seção Record Mode é renderizada', () => {
    renderDialog()

    expect(screen.getByText('Record Mode')).toBeInTheDocument()
    expect(screen.getByLabelText(/gravar interações/i)).toBeInTheDocument()
  })

  it('switch de record está desabilitado quando proxyEnabled=false', () => {
    renderDialog({ proxyEnabled: false })

    const switches = screen.getAllByRole('switch')
    const recordSwitch = screen.getByLabelText(/gravar interações/i)
    expect(recordSwitch).toBeDisabled()
  })

  it('switch de record está habilitado quando proxyEnabled=true', () => {
    renderDialog({ proxyEnabled: true, proxyUrl: 'https://api.example.com' })

    const recordSwitch = screen.getByLabelText(/gravar interações/i)
    expect(recordSwitch).not.toBeDisabled()
  })

  it('texto de ajuda aparece quando proxyEnabled=false', () => {
    renderDialog({ proxyEnabled: false })

    expect(screen.getByText(/ative o proxy mode primeiro/i)).toBeInTheDocument()
  })

  it('texto de ajuda não aparece quando proxyEnabled=true', () => {
    renderDialog({ proxyEnabled: true, proxyUrl: 'https://api.example.com' })

    expect(screen.queryByText(/ative o proxy mode primeiro/i)).not.toBeInTheDocument()
  })

  it('submit inclui recordEnabled no payload', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(baseWorkspace)
    ;(useUpdateWorkspace as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      reset: vi.fn(),
    })

    const user = userEvent.setup()
    renderDialog({ proxyEnabled: true, proxyUrl: 'https://api.example.com' })

    const recordSwitch = screen.getByLabelText(/gravar interações/i)
    await user.click(recordSwitch)

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledOnce()
      const args = mutateAsync.mock.calls[0][0]
      expect(args.data.recordEnabled).toBe(true)
    })
  })

  it('popula switch com valor atual do workspace', () => {
    renderDialog({ proxyEnabled: true, proxyUrl: 'https://api.example.com', recordEnabled: true })

    const recordSwitch = screen.getByLabelText(/gravar interações/i)
    expect(recordSwitch).toBeChecked()
  })
})
