import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EndpointEdit } from '@web/pages/endpoint-edit'
import type { Endpoint } from '@web/types/endpoint'

vi.mock('@web/hooks/use-endpoint', () => ({
  useEndpoint: vi.fn(),
}))

vi.mock('@web/hooks/use-update-endpoint', () => ({
  useUpdateEndpoint: vi.fn(),
}))

vi.mock('@web/hooks/use-delete-endpoint', () => ({
  useDeleteEndpoint: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
    useParams: vi.fn().mockReturnValue({ id: 'test-id-123' }),
  }
})

import { useEndpoint } from '@web/hooks/use-endpoint'
import { useUpdateEndpoint } from '@web/hooks/use-update-endpoint'
import { useDeleteEndpoint } from '@web/hooks/use-delete-endpoint'

const mockUseEndpoint = vi.mocked(useEndpoint)
const mockUseUpdateEndpoint = vi.mocked(useUpdateEndpoint)
const mockUseDeleteEndpoint = vi.mocked(useDeleteEndpoint)

const mockEndpoint: Endpoint = {
  id: 'test-id-123',
  name: 'Listar usuários',
  method: 'GET',
  path: '/users',
  active: true,
  responseStatus: 200,
  responseBody: '{"users":[]}',
  responseHeaders: {},
  delay: 0,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <EndpointEdit />
    </MemoryRouter>,
  )
}

describe('EndpointEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseUpdateEndpoint.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    } as any)

    mockUseDeleteEndpoint.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    } as any)
  })

  it('exibe skeleton de loading quando isLoading é true', () => {
    mockUseEndpoint.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    const { container } = renderPage()

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('exibe "Endpoint não encontrado" quando loadError está presente', () => {
    mockUseEndpoint.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
    } as any)

    renderPage()

    expect(screen.getByText(/endpoint não encontrado/i)).toBeInTheDocument()
  })

  it('exibe "Endpoint não encontrado" quando data é undefined sem loading', () => {
    mockUseEndpoint.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any)

    renderPage()

    expect(screen.getByText(/endpoint não encontrado/i)).toBeInTheDocument()
  })

  it('renderiza formulário preenchido com os dados do endpoint', () => {
    mockUseEndpoint.mockReturnValue({
      data: mockEndpoint,
      isLoading: false,
      error: null,
    } as any)

    renderPage()

    expect(screen.getByRole('heading', { name: /editar endpoint/i })).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/nome/i) as HTMLInputElement
    expect(nameInput.value).toBe('Listar usuários')

    const pathInput = screen.getByLabelText(/^path$/i) as HTMLInputElement
    expect(pathInput.value).toBe('/users')
  })

  it('exibe nome do endpoint abaixo do título h1', () => {
    mockUseEndpoint.mockReturnValue({
      data: mockEndpoint,
      isLoading: false,
      error: null,
    } as any)

    renderPage()

    // O <p> com o nome fica abaixo do h1 "Editar endpoint"
    expect(screen.getByText('Listar usuários')).toBeInTheDocument()
  })

  it('botão Deletar abre o dialog de confirmação', async () => {
    const user = userEvent.setup()

    mockUseEndpoint.mockReturnValue({
      data: mockEndpoint,
      isLoading: false,
      error: null,
    } as any)

    renderPage()

    const deleteButton = screen.getByRole('button', { name: /deletar/i })
    await user.click(deleteButton)

    await waitFor(() => {
      // O dialog exibe o título "Deletar endpoint"
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    expect(
      screen.getByText(/tem certeza que deseja deletar/i),
    ).toBeInTheDocument()
  })

  it('exibe erro de conflito quando updateMutation.error.code === "CONFLICT"', () => {
    const conflictError = Object.assign(new Error('Conflict'), { code: 'CONFLICT' })

    mockUseEndpoint.mockReturnValue({
      data: mockEndpoint,
      isLoading: false,
      error: null,
    } as any)

    mockUseUpdateEndpoint.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: conflictError,
    } as any)

    renderPage()

    expect(
      screen.getByText(/já existe um endpoint ativo com esse método e path/i),
    ).toBeInTheDocument()
  })

  it('exibe mensagem de erro genérica do update quando não é CONFLICT', () => {
    const genericError = new Error('Erro ao atualizar endpoint')

    mockUseEndpoint.mockReturnValue({
      data: mockEndpoint,
      isLoading: false,
      error: null,
    } as any)

    mockUseUpdateEndpoint.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: genericError,
    } as any)

    renderPage()

    expect(screen.getByText(/erro ao atualizar endpoint/i)).toBeInTheDocument()
  })

  it('botão Voltar navega para "/" na tela de erro', async () => {
    const user = userEvent.setup()

    mockUseEndpoint.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
    } as any)

    renderPage()

    await user.click(screen.getByRole('button', { name: /voltar/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('update com sucesso navega para "/"', async () => {
    const user = userEvent.setup()

    let capturedOnSuccess: (() => void) | undefined

    mockUseEndpoint.mockReturnValue({
      data: mockEndpoint,
      isLoading: false,
      error: null,
    } as any)

    mockUseUpdateEndpoint.mockReturnValue({
      mutate: vi.fn((_, options) => {
        capturedOnSuccess = options?.onSuccess
      }),
      isPending: false,
      error: null,
    } as any)

    renderPage()

    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))

    await waitFor(() => {
      expect(capturedOnSuccess).toBeDefined()
    })

    capturedOnSuccess!()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
