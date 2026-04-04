import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EndpointForm } from '@web/components/endpoint-form'
import type { Endpoint } from '@web/types/endpoint'

vi.mock('@uiw/react-codemirror', () => ({
  default: ({
    value,
    onChange,
    className,
    style,
    placeholder,
  }: {
    value: string
    onChange: (v: string) => void
    className?: string
    style?: React.CSSProperties
    placeholder?: string
  }) => (
    <textarea
      data-testid="codemirror-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={style}
      placeholder={placeholder}
    />
  ),
}))

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

    // Textarea de body
    expect(screen.getByPlaceholderText(/\{"status"/)).toBeInTheDocument()

    // Método padrão GET visível no select (pode haver múltiplos por Radix Select)
    expect(screen.getAllByText('GET').length).toBeGreaterThanOrEqual(1)
  })

  it('exibe mensagem de erro quando prop error é passada', () => {
    renderForm({ onSubmit: vi.fn(), error: 'Erro de conflito na API', isError: true })
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
    expect(screen.getAllByText('GET').length).toBeGreaterThanOrEqual(1)
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
    expect(screen.getAllByText('POST').length).toBeGreaterThanOrEqual(1)
    expect((screen.getByPlaceholderText('/api/users/:id') as HTMLInputElement).value).toBe('/meu/path')
    expect((screen.getByPlaceholderText('200') as HTMLInputElement).value).toBe('201')
    expect((screen.getByPlaceholderText('0') as HTMLInputElement).value).toBe('500')
  })

  it('exibe submitLabel personalizado no botão', () => {
    renderForm({ onSubmit: vi.fn(), submitLabel: 'Criar endpoint' })
    expect(screen.getByRole('button', { name: /criar endpoint/i })).toBeInTheDocument()
  })

  it('exibe "Salvando..." quando isPending é true', () => {
    renderForm({ onSubmit: vi.fn(), isPending: true })
    expect(screen.getByRole('button', { name: /salvando/i })).toBeInTheDocument()
  })

  // T10 — JsonEditor integration cases

  it('formulário inicializa responseBody com "{}"', () => {
    renderForm({ onSubmit: vi.fn() })

    const editor = screen.getByTestId('codemirror-editor') as HTMLTextAreaElement
    expect(editor.value).toBe('{}')
  })

  it('exibe erro "JSON inválido" ao submeter com responseBody inválido', async () => {
    const user = userEvent.setup()
    renderForm({ onSubmit: vi.fn() })

    const nameInput = screen.getByPlaceholderText(/Ex: Listar usuários/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Teste')

    const pathInput = screen.getByPlaceholderText('/api/users/:id')
    await user.clear(pathInput)
    await user.type(pathInput, '/teste')

    const editor = screen.getByTestId('codemirror-editor')
    fireEvent.change(editor, { target: { value: 'invalid json' } })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(screen.getByText('JSON inválido')).toBeInTheDocument()
    })
  })

  it('exibe classe de erro no editor quando JSON é inválido após submit', async () => {
    const user = userEvent.setup()
    renderForm({ onSubmit: vi.fn() })

    const nameInput = screen.getByPlaceholderText(/Ex: Listar usuários/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Teste')

    const pathInput = screen.getByPlaceholderText('/api/users/:id')
    await user.clear(pathInput)
    await user.type(pathInput, '/teste')

    const editor = screen.getByTestId('codemirror-editor')
    fireEvent.change(editor, { target: { value: 'bad json' } })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      const editorEl = screen.getByTestId('codemirror-editor')
      const borderWrapper = editorEl.parentElement as HTMLElement
      expect(borderWrapper?.className).toMatch(/border-destructive/)
    })
  })

  it('desabilita o botão "Salvar" com JSON inválido e habilita ao corrigir', async () => {
    renderForm({ onSubmit: vi.fn() })

    const editor = screen.getByTestId('codemirror-editor')
    const submitButton = screen.getByRole('button', { name: /salvar/i })

    fireEvent.change(editor, { target: { value: 'bad json' } })

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })

    fireEvent.change(editor, { target: { value: '{"fixed": true}' } })

    await waitFor(() => {
      expect(submitButton).toBeEnabled()
    })
  })

  it('permite submissão após corrigir JSON inválido para válido', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm({ onSubmit })

    const nameInput = screen.getByPlaceholderText(/Ex: Listar usuários/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Teste')

    const pathInput = screen.getByPlaceholderText('/api/users/:id')
    await user.clear(pathInput)
    await user.type(pathInput, '/teste')

    const editor = screen.getByTestId('codemirror-editor')

    // Set invalid JSON first
    fireEvent.change(editor, { target: { value: 'bad json' } })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(screen.getByText('JSON inválido')).toBeInTheDocument()
    })

    // Fix JSON
    fireEvent.change(editor, { target: { value: '{"fixed": true}' } })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
      const args = onSubmit.mock.calls[0][0]
      expect(args.responseBody).toBe('{"fixed": true}')
    })
  })
})
