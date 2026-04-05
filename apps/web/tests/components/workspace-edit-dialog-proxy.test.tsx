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

describe('WorkspaceEditDialog — seção de proxy', () => {
  it('campos de proxy renderizam quando dialog está aberto', () => {
    renderDialog()

    expect(screen.getByText('Proxy Mode')).toBeInTheDocument()
    expect(screen.getByLabelText(/Encaminhar requests sem mock/i)).toBeInTheDocument()
    expect(screen.getByText(/Encaminhar requests sem mock/i)).toBeInTheDocument()
  })

  it('switch toggle muda estado para ativado', async () => {
    const user = userEvent.setup()
    renderDialog()

    const toggle = screen.getByLabelText(/Encaminhar requests sem mock/i)
    expect(toggle).not.toBeChecked()

    await user.click(toggle)

    expect(toggle).toBeChecked()
  })

  it('input de URL aparece quando switch está ativado', async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(screen.queryByPlaceholderText(/https:\/\/api/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/Encaminhar requests sem mock/i))

    expect(screen.getByPlaceholderText(/https:\/\/api/i)).toBeInTheDocument()
  })

  it('input de URL desaparece quando switch está desativado após ser ativado', async () => {
    const user = userEvent.setup()
    renderDialog()

    const toggle = screen.getByLabelText(/Encaminhar requests sem mock/i)

    await user.click(toggle)
    expect(screen.getByPlaceholderText(/https:\/\/api/i)).toBeInTheDocument()

    await user.click(toggle)
    expect(screen.queryByPlaceholderText(/https:\/\/api/i)).not.toBeInTheDocument()
  })

  it('erro de validação aparece quando proxy ativo e URL vazia', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByLabelText(/Encaminhar requests sem mock/i))
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(screen.getByText('URL é obrigatória quando proxy está ativo')).toBeInTheDocument()
    })
  })

  it('alert aparece quando globallyEnabled é false', () => {
    ;(useProxyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { globallyEnabled: false, timeoutMs: 5000 },
    })

    renderDialog()

    expect(screen.getByText(/proxy mode desativado globalmente pelo administrador/i)).toBeInTheDocument()
  })

  it('switch fica disabled quando globallyEnabled é false', () => {
    ;(useProxyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { globallyEnabled: false, timeoutMs: 5000 },
    })

    renderDialog()

    expect(screen.getByLabelText(/Encaminhar requests sem mock/i)).toBeDisabled()
  })

  it('popula o switch com o valor atual do workspace ao abrir', () => {
    renderDialog({ proxyEnabled: true, proxyUrl: 'https://api.example.com' })

    expect(screen.getByLabelText(/Encaminhar requests sem mock/i)).toBeChecked()
    expect(screen.getByDisplayValue('https://api.example.com')).toBeInTheDocument()
  })

  it('inclui proxyEnabled e proxyUrl no payload ao salvar', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(baseWorkspace)
    ;(useUpdateWorkspace as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      reset: vi.fn(),
    })

    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByLabelText(/Encaminhar requests sem mock/i))
    await user.type(screen.getByPlaceholderText(/https:\/\/api/i), 'https://api.example.com')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledOnce()
      const args = mutateAsync.mock.calls[0][0]
      expect(args.data.proxyEnabled).toBe(true)
      expect(args.data.proxyUrl).toBe('https://api.example.com')
    })
  })
})
