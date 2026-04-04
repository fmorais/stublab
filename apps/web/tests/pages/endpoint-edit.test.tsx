import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EndpointEdit } from '@web/pages/endpoint-edit'
import type { Endpoint } from '@web/types/endpoint'

vi.mock('@web/hooks/use-endpoints', () => ({
  useEndpoints: vi.fn(),
  useEndpoint: vi.fn(),
}))

vi.mock('@web/hooks/use-update-endpoint', () => ({
  useUpdateEndpoint: vi.fn(),
}))

vi.mock('@web/hooks/use-delete-endpoint', () => ({
  useDeleteEndpoint: vi.fn(),
}))

vi.mock('@web/hooks/use-workspaces', () => ({
  useWorkspace: vi.fn(() => ({ data: { id: 'ws-1', name: 'Default', slug: 'default' } })),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
    useParams: vi.fn().mockReturnValue({ slug: 'default', id: 'test-id-123' }),
  }
})

import { useEndpoint } from '@web/hooks/use-endpoints'
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
  matchingRules: [],
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EndpointEdit />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EndpointEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseUpdateEndpoint.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
      error: null,
    } as any)

    mockUseDeleteEndpoint.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as any)
  })

  it('exibe skeleton de loading quando isLoading é true', () => {
    mockUseEndpoint.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any)

    const { container } = renderPage()

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('exibe "Endpoint não encontrado" quando isError é true', () => {
    mockUseEndpoint.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any)

    renderPage()

    expect(screen.getByText(/endpoint não encontrado/i)).toBeInTheDocument()
  })

  it('exibe "Endpoint não encontrado" quando data é undefined sem loading', () => {
    mockUseEndpoint.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as any)

    renderPage()

    expect(screen.getByText(/endpoint não encontrado/i)).toBeInTheDocument()
  })

  it('renderiza formulário preenchido com os dados do endpoint', () => {
    mockUseEndpoint.mockReturnValue({
      data: mockEndpoint,
      isLoading: false,
      isError: false,
    } as any)

    renderPage()

    expect(screen.getByRole('heading', { name: /editar endpoint/i })).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/nome/i) as HTMLInputElement
    expect(nameInput.value).toBe('Listar usuários')

    const pathInput = screen.getByLabelText(/^path$/i) as HTMLInputElement
    expect(pathInput.value).toBe('/users')
  })

  it('exibe botão Deletar na página', () => {
    mockUseEndpoint.mockReturnValue({
      data: mockEndpoint,
      isLoading: false,
      isError: false,
    } as any)

    renderPage()

    expect(screen.getByRole('button', { name: /deletar/i })).toBeInTheDocument()
  })

  it('exibe erro de conflito quando updateMutation.error.code === "CONFLICT"', () => {
    const conflictError = Object.assign(new Error('Conflict'), { code: 'CONFLICT' })

    mockUseEndpoint.mockReturnValue({
      data: mockEndpoint,
      isLoading: false,
      isError: false,
    } as any)

    mockUseUpdateEndpoint.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: true,
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
      isError: false,
    } as any)

    mockUseUpdateEndpoint.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: true,
      error: genericError,
    } as any)

    renderPage()

    expect(screen.getByText(/erro ao atualizar endpoint/i)).toBeInTheDocument()
  })

  it('botão Voltar navega para a lista do workspace na tela de erro', async () => {
    const user = userEvent.setup()

    mockUseEndpoint.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any)

    renderPage()

    await user.click(screen.getByRole('button', { name: /voltar/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/default/endpoints')
  })
})
