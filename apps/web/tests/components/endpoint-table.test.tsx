import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EndpointTable } from '@web/components/endpoint-table'
import type { Endpoint } from '@web/types/endpoint'

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
  matchingRules: [],
  ...overrides,
})

function renderTable(endpoints: Endpoint[], props: Partial<Parameters<typeof EndpointTable>[0]> = {}) {
  return render(
    <MemoryRouter>
      <EndpointTable endpoints={endpoints} {...props} />
    </MemoryRouter>,
  )
}

describe('EndpointTable', () => {
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

  it('exibe mensagem quando lista está vazia', () => {
    renderTable([])
    expect(screen.getByText(/nenhum endpoint cadastrado/i)).toBeInTheDocument()
  })

  it('botão toggle chama onToggleActive com o endpoint correto', async () => {
    const user = userEvent.setup()
    const onToggleActive = vi.fn()
    const endpoint = makeEndpoint({ id: 'ep-42' })

    renderTable([endpoint], { onToggleActive })

    await user.click(screen.getByRole('button', { name: /desativar|ativar/i }))

    expect(onToggleActive).toHaveBeenCalledWith(endpoint)
  })

  it('botão "Excluir" chama onDelete com o endpoint correto', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const endpoint = makeEndpoint({ name: 'Endpoint para deletar' })

    renderTable([endpoint], { onDelete })

    await user.click(screen.getByRole('button', { name: /excluir/i }))

    expect(onDelete).toHaveBeenCalledWith(endpoint)
  })

  it('botão "Editar" chama onEdit com o endpoint correto', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const endpoint = makeEndpoint({ id: 'ep-99' })

    renderTable([endpoint], { onEdit })

    await user.click(screen.getByRole('button', { name: /editar/i }))

    expect(onEdit).toHaveBeenCalledWith(endpoint)
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

  it('exibe badge de regras quando endpoint tem matchingRules', () => {
    const endpoint = makeEndpoint({
      matchingRules: [
        { id: 'r1', endpointId: 'ep-1', source: 'query', field: 'env', operator: 'eq', value: 'prod', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'r2', endpointId: 'ep-1', source: 'header', field: 'x-tenant', operator: 'exists', value: null, createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    })

    renderTable([endpoint])

    expect(screen.getByText('2 regras')).toBeInTheDocument()
  })

  it('não exibe badge quando endpoint não tem regras', () => {
    renderTable([makeEndpoint({ matchingRules: [] })])

    expect(screen.queryByText(/regra/i)).not.toBeInTheDocument()
  })
})
