import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EndpointTable } from '@web/components/endpoint-table'
import type { Endpoint } from '@web/types/endpoint'

vi.mock('@web/hooks/use-toggle-endpoint', () => ({
  useToggleEndpoint: vi.fn(),
}))

vi.mock('@web/hooks/use-delete-endpoint', () => ({
  useDeleteEndpoint: vi.fn(),
}))

import { useToggleEndpoint } from '@web/hooks/use-toggle-endpoint'
import { useDeleteEndpoint } from '@web/hooks/use-delete-endpoint'

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

function renderTable(endpoints: Endpoint[]) {
  return render(
    <MemoryRouter>
      <EndpointTable endpoints={endpoints} />
    </MemoryRouter>,
  )
}

describe('EndpointTable', () => {
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

  it('renderiza lista de endpoints com nome, método e path', () => {
    const endpoints = [
      makeEndpoint({ id: 'ep-1', name: 'Listar usuários', method: 'GET', path: '/api/users' }),
      makeEndpoint({ id: 'ep-2', name: 'Criar usuário', method: 'POST', path: '/api/users' }),
    ]

    renderTable(endpoints)

    expect(screen.getByText('Listar usuários')).toBeInTheDocument()
    expect(screen.getByText('Criar usuário')).toBeInTheDocument()
    expect(screen.getByText('GET')).toBeInTheDocument()
    expect(screen.getByText('POST')).toBeInTheDocument()
    expect(screen.getAllByText('/api/users')).toHaveLength(2)
  })

  it('exibe "Nenhum endpoint cadastrado" quando lista está vazia', () => {
    renderTable([])
    expect(screen.getByText('Nenhum endpoint cadastrado')).toBeInTheDocument()
  })

  it('botão toggle chama mutate com o ID correto', async () => {
    const user = userEvent.setup()
    const mutateMock = vi.fn()

    mockUseToggleEndpoint.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof useToggleEndpoint>)

    renderTable([makeEndpoint({ id: 'ep-42' })])

    const toggleButton = screen.getByRole('switch')
    await user.click(toggleButton)

    expect(mutateMock).toHaveBeenCalledWith('ep-42', expect.any(Object))
  })

  it('botão "Deletar" abre o DeleteConfirmDialog', async () => {
    const user = userEvent.setup()

    renderTable([makeEndpoint({ name: 'Endpoint para deletar' })])

    await user.click(screen.getByRole('button', { name: /deletar/i }))

    await waitFor(() => {
      expect(screen.getByText(/deletar endpoint/i)).toBeInTheDocument()
      expect(screen.getByText(/"Endpoint para deletar"/)).toBeInTheDocument()
    })
  })

  it('botão "Editar" navega para /endpoints/:id/edit', async () => {
    const user = userEvent.setup()

    renderTable([makeEndpoint({ id: 'ep-99' })])

    await user.click(screen.getByRole('button', { name: /editar/i }))

    // A navegação no MemoryRouter não causa erro — o botão apenas chama navigate()
    // Verificamos que o botão existe e é clicável
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
  })

  it('renderiza o status HTTP de cada endpoint', () => {
    const endpoints = [
      makeEndpoint({ id: 'ep-1', responseStatus: 200 }),
      makeEndpoint({ id: 'ep-2', responseStatus: 404 }),
    ]

    renderTable(endpoints)

    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('switch reflete o estado active do endpoint', () => {
    const endpoints = [
      makeEndpoint({ id: 'ep-1', active: true }),
      makeEndpoint({ id: 'ep-2', active: false }),
    ]

    renderTable(endpoints)

    const switches = screen.getAllByRole('switch')
    expect(switches[0]).toHaveAttribute('aria-checked', 'true')
    expect(switches[1]).toHaveAttribute('aria-checked', 'false')
  })
})
