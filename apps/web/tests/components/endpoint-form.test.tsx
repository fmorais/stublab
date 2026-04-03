import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EndpointForm } from '@web/components/endpoint-form'
import type { Endpoint } from '@web/types/endpoint'

function renderForm(props: React.ComponentProps<typeof EndpointForm>) {
  return render(
    <MemoryRouter>
      <EndpointForm {...props} />
    </MemoryRouter>,
  )
}

describe('EndpointForm', () => {
  it('renderiza todos os campos do formulário', () => {
    renderForm({ onSubmit: vi.fn() })

    // Inputs por placeholder
    expect(screen.getByPlaceholderText(/Ex: Listar usuários/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('/api/users/:id')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('200')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0')).toBeInTheDocument()

    // Textarea por placeholder
    expect(screen.getAllByPlaceholderText('{}').length).toBeGreaterThanOrEqual(1)

    // Select de método por texto visível
    expect(screen.getByDisplayValue('GET')).toBeInTheDocument()
  })

  it('exibe mensagem de erro quando prop error é passada', () => {
    renderForm({ onSubmit: vi.fn(), error: 'Erro de conflito na API' })
    expect(screen.getByText('Erro de conflito na API')).toBeInTheDocument()
  })

  it('não exibe mensagem de erro quando prop error é null', () => {
    renderForm({ onSubmit: vi.fn(), error: null })
    expect(screen.queryByText('Erro de conflito na API')).not.toBeInTheDocument()
  })

  it('exibe mensagem "Nome é obrigatório" ao submeter com name vazio', async () => {
    const user = userEvent.setup()
    renderForm({ onSubmit: vi.fn() })

    const nameInput = screen.getByPlaceholderText(/Ex: Listar usuários/i)
    await user.clear(nameInput)

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument()
    })
  })

  it('exibe erro de validação quando path não começa com /', async () => {
    const user = userEvent.setup()
    renderForm({ onSubmit: vi.fn() })

    const pathInput = screen.getByPlaceholderText('/api/users/:id')
    await user.clear(pathInput)
    await user.type(pathInput, 'api/users')

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(screen.getByText('Path deve começar com /')).toBeInTheDocument()
    })
  })

  it('chama onSubmit com dados corretos quando formulário válido é submetido', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm({ onSubmit })

    const nameInput = screen.getByPlaceholderText(/Ex: Listar usuários/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Listar usuários')

    const pathInput = screen.getByPlaceholderText('/api/users/:id')
    await user.clear(pathInput)
    await user.type(pathInput, '/api/users')

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce()
      const args = onSubmit.mock.calls[0][0]
      expect(args.name).toBe('Listar usuários')
      expect(args.path).toBe('/api/users')
    })
  })

  it('campo method inicia com "GET" por padrão', () => {
    renderForm({ onSubmit: vi.fn() })
    const select = screen.getByDisplayValue('GET') as HTMLSelectElement
    expect(select.value).toBe('GET')
  })

  it('defaultValues preenche o formulário corretamente', () => {
    const defaultValues: Partial<Endpoint> = {
      name: 'Meu endpoint',
      method: 'POST',
      path: '/meu/path',
      responseStatus: 201,
      responseBody: '{"ok":true}',
      responseHeaders: { 'X-Custom': 'valor' },
      delay: 500,
    }

    renderForm({ onSubmit: vi.fn(), defaultValues })

    expect((screen.getByPlaceholderText(/Ex: Listar usuários/i) as HTMLInputElement).value).toBe('Meu endpoint')
    expect((screen.getByDisplayValue('POST') as HTMLSelectElement).value).toBe('POST')
    expect((screen.getByPlaceholderText('/api/users/:id') as HTMLInputElement).value).toBe('/meu/path')
    expect((screen.getByPlaceholderText('200') as HTMLInputElement).value).toBe('201')
    expect((screen.getByPlaceholderText('0') as HTMLInputElement).value).toBe('500')
  })

  it('exibe submitLabel personalizado no botão', () => {
    renderForm({ onSubmit: vi.fn(), submitLabel: 'Criar endpoint' })
    expect(screen.getByRole('button', { name: /criar endpoint/i })).toBeInTheDocument()
  })

  it('exibe "Salvando..." quando isLoading é true', () => {
    renderForm({ onSubmit: vi.fn(), isLoading: true })
    expect(screen.getByRole('button', { name: /salvando/i })).toBeInTheDocument()
  })
})
