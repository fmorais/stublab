import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EndpointCreate } from '@web/pages/endpoint-create'

vi.mock('@web/hooks/use-create-endpoint', () => ({
  useCreateEndpoint: vi.fn(),
}))

vi.mock('@web/hooks/use-workspaces', () => ({
  useWorkspace: vi.fn(() => ({ data: { name: 'Default', slug: 'default' } })),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
  }
})

import { useCreateEndpoint } from '@web/hooks/use-create-endpoint'

const mockUseCreateEndpoint = vi.mocked(useCreateEndpoint)

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/workspaces/default/endpoints/new']}>
        <Routes>
          <Route path="/workspaces/:slug/endpoints/new" element={<EndpointCreate />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EndpointCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCreateEndpoint.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as any)
  })

  it('renderiza o formulário com título "Novo endpoint" e botão de submit', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /novo endpoint/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar endpoint/i })).toBeInTheDocument()
  })

  it('botão Cancelar navega para a lista do workspace', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/default/endpoints')
  })

  it('submit com sucesso navega para a lista do workspace', async () => {
    const user = userEvent.setup()

    mockUseCreateEndpoint.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as any)

    renderPage()

    await user.clear(screen.getByLabelText(/nome/i))
    await user.type(screen.getByLabelText(/nome/i), 'Listar usuários')

    await user.clear(screen.getByLabelText(/^path$/i))
    await user.type(screen.getByLabelText(/^path$/i), '/users')

    await user.click(screen.getByRole('button', { name: /criar endpoint/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/workspaces/default/endpoints')
    })
  })

  it('botão de submit fica desabilitado quando isPending é true', () => {
    mockUseCreateEndpoint.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as any)

    renderPage()

    const submitButton = screen.getByRole('button', { name: /salvando/i })
    expect(submitButton).toBeDisabled()
  })
})
