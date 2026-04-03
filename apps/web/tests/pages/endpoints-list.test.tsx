import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EndpointsList } from '@web/pages/endpoints-list'
import type { Endpoint } from '@web/types/endpoint'

vi.mock('@web/hooks/use-endpoints', () => ({
  useEndpoints: vi.fn(),
}))

vi.mock('@web/hooks/use-toggle-endpoint', () => ({
  useToggleEndpoint: vi.fn(),
}))

vi.mock('@web/hooks/use-delete-endpoint', () => ({
  useDeleteEndpoint: vi.fn(),
}))

import { useEndpoints } from '@web/hooks/use-endpoints'
import { useToggleEndpoint } from '@web/hooks/use-toggle-endpoint'
import { useDeleteEndpoint } from '@web/hooks/use-delete-endpoint'

const mockUseEndpoints = vi.mocked(useEndpoints)
const mockUseToggleEndpoint = vi.mocked(useToggleEndpoint)
const mockUseDeleteEndpoint = vi.mocked(useDeleteEndpoint)

const makeEndpoint = (overrides: Partial<Endpoint> = {}): Endpoint => ({
  id: 'ep-1',
  name: 'Listar usuários',
  method: 'GET',
  path: '/api/users',
  active: true,
  responseStatus: 200,
  responseBody: '{}',
  responseHeaders: {},
  delay: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

function renderPage() {
  return render(
    <MemoryRouter>
      <EndpointsList />
    </MemoryRouter>,
  )
}

describe('EndpointsList', () => {
  beforeEach(() => {
    mockUseToggleEndpoint.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useToggleEndpoint>)

    mockUseDeleteEndpoint.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteEndpoint>)
  })

  it('exibe skeleton de loading quando isLoading é true', () => {
    mockUseEndpoints.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useEndpoints>)

    const { container } = renderPage()

    // Skeleton usa animate-pulse
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('exibe mensagem de erro quando error não é null', () => {
    mockUseEndpoints.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Falha na requisição'),
    } as unknown as ReturnType<typeof useEndpoints>)

    renderPage()

    expect(
      screen.getByText(/erro ao carregar endpoints/i),
    ).toBeInTheDocument()
  })

  it('exibe lista de endpoints quando dados carregam', () => {
    const endpoints = [
      makeEndpoint({ id: 'ep-1', name: 'Listar usuários' }),
      makeEndpoint({ id: 'ep-2', name: 'Criar usuário', method: 'POST' }),
    ]

    mockUseEndpoints.mockReturnValue({
      data: { data: endpoints, total: 2 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEndpoints>)

    renderPage()

    expect(screen.getByText('Listar usuários')).toBeInTheDocument()
    expect(screen.getByText('Criar usuário')).toBeInTheDocument()
  })

  it('exibe contador "N endpoints cadastrados"', () => {
    const endpoints = [
      makeEndpoint({ id: 'ep-1' }),
      makeEndpoint({ id: 'ep-2' }),
      makeEndpoint({ id: 'ep-3' }),
    ]

    mockUseEndpoints.mockReturnValue({
      data: { data: endpoints, total: 3 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEndpoints>)

    renderPage()

    expect(screen.getByText(/3 endpoints cadastrados/i)).toBeInTheDocument()
  })

  it('exibe "0 endpoints cadastrados" quando não há dados', () => {
    mockUseEndpoints.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEndpoints>)

    renderPage()

    expect(screen.getByText(/0 endpoints cadastrados/i)).toBeInTheDocument()
  })

  it('botão "Novo endpoint" está presente na página', async () => {
    const user = userEvent.setup()

    mockUseEndpoints.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEndpoints>)

    renderPage()

    const button = screen.getByRole('button', { name: /novo endpoint/i })
    expect(button).toBeInTheDocument()

    // Clicar deve funcionar sem erros (navigate dentro do MemoryRouter)
    await user.click(button)
  })

  it('exibe "Nenhum endpoint cadastrado" quando lista está vazia e dados carregaram', () => {
    mockUseEndpoints.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEndpoints>)

    renderPage()

    expect(screen.getByText('Nenhum endpoint cadastrado')).toBeInTheDocument()
  })
})
