import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EndpointNew } from '@web/pages/endpoint-new'

vi.mock('@web/hooks/use-create-endpoint', () => ({
  useCreateEndpoint: vi.fn(),
}))

// EndpointForm usa react-hook-form internamente; não depende de use-endpoints,
// mas garantimos que qualquer import futuro não quebre os testes.
vi.mock('@web/hooks/use-endpoints', () => ({
  useEndpoints: vi.fn(),
}))

// Captura chamadas ao useNavigate para verificar redirecionamentos
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
  return render(
    <MemoryRouter>
      <EndpointNew />
    </MemoryRouter>,
  )
}

describe('EndpointNew', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCreateEndpoint.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    } as any)
  })

  it('renderiza o formulário com título "Novo endpoint" e botão de submit', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /novo endpoint/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar endpoint/i })).toBeInTheDocument()
  })

  it('exibe o botão Voltar na página', () => {
    renderPage()

    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument()
  })

  it('botão Voltar navega para "/"', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /voltar/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('submit com sucesso chama onSuccess que navega para "/"', async () => {
    const user = userEvent.setup()

    let capturedOnSuccess: (() => void) | undefined

    mockUseCreateEndpoint.mockReturnValue({
      mutate: vi.fn((_, options) => {
        capturedOnSuccess = options?.onSuccess
      }),
      isPending: false,
      error: null,
    } as any)

    renderPage()

    // Preenche os campos obrigatórios para que o form seja válido
    await user.clear(screen.getByLabelText(/nome/i))
    await user.type(screen.getByLabelText(/nome/i), 'Listar usuários')

    // Path já tem valor padrão "/", limpa e preenche valor válido
    await user.clear(screen.getByLabelText(/^path$/i))
    await user.type(screen.getByLabelText(/^path$/i), '/users')

    await user.click(screen.getByRole('button', { name: /criar endpoint/i }))

    await waitFor(() => {
      expect(capturedOnSuccess).toBeDefined()
    })

    capturedOnSuccess!()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('exibe erro de conflito (409) quando error.code === "CONFLICT"', () => {
    const conflictError = Object.assign(new Error('Conflict'), { code: 'CONFLICT' })

    mockUseCreateEndpoint.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: conflictError,
    } as any)

    renderPage()

    expect(
      screen.getByText(/já existe um endpoint ativo com esse método e path/i),
    ).toBeInTheDocument()
  })

  it('exibe mensagem de erro genérica quando error.message está presente sem code CONFLICT', () => {
    const genericError = new Error('Erro interno do servidor')

    mockUseCreateEndpoint.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: genericError,
    } as any)

    renderPage()

    expect(screen.getByText(/erro interno do servidor/i)).toBeInTheDocument()
  })

  it('botão de submit fica desabilitado quando isPending é true', () => {
    mockUseCreateEndpoint.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
    } as any)

    renderPage()

    const submitButton = screen.getByRole('button', { name: /salvando/i })
    expect(submitButton).toBeDisabled()
  })
})
