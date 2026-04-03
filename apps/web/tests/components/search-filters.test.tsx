import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchFilters } from '@web/components/search-filters'

describe('SearchFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderiza input de busca e selects de método e status', () => {
    render(<SearchFilters onFilterChange={vi.fn()} />)

    expect(screen.getByPlaceholderText(/buscar por nome ou path/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Todos os métodos')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Todos os status')).toBeInTheDocument()
  })

  it('chama onFilterChange após debounce de 300ms ao digitar no input', async () => {
    const onFilterChange = vi.fn()
    render(<SearchFilters onFilterChange={onFilterChange} />)

    // Dispara o timer inicial da montagem
    act(() => { vi.advanceTimersByTime(300) })
    onFilterChange.mockClear()

    const input = screen.getByPlaceholderText(/buscar por nome ou path/i)

    // Simula mudança direta no input
    act(() => {
      input.focus()
      Object.defineProperty(input, 'value', { writable: true, value: 'usuários' })
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Antes do timer não deve ter chamado
    act(() => { vi.advanceTimersByTime(299) })
    expect(onFilterChange).not.toHaveBeenCalled()

    // Após o debounce completo
    act(() => { vi.advanceTimersByTime(1) })
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'usuários' }),
    )
  })

  it('selecionar método chama onFilterChange com o método correto', async () => {
    const onFilterChange = vi.fn()
    render(<SearchFilters onFilterChange={onFilterChange} />)

    // Dispara o timer inicial
    act(() => { vi.advanceTimersByTime(300) })
    onFilterChange.mockClear()

    const methodSelect = screen.getByDisplayValue('Todos os métodos') as HTMLSelectElement

    act(() => {
      methodSelect.value = 'GET'
      methodSelect.dispatchEvent(new Event('change', { bubbles: true }))
    })

    act(() => { vi.advanceTimersByTime(300) })

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('selecionar status "Ativos" chama onFilterChange com active: "true"', async () => {
    const onFilterChange = vi.fn()
    render(<SearchFilters onFilterChange={onFilterChange} />)

    act(() => { vi.advanceTimersByTime(300) })
    onFilterChange.mockClear()

    const statusSelect = screen.getByDisplayValue('Todos os status') as HTMLSelectElement

    act(() => {
      statusSelect.value = 'true'
      statusSelect.dispatchEvent(new Event('change', { bubbles: true }))
    })

    act(() => { vi.advanceTimersByTime(300) })

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ active: 'true' }),
    )
  })

  it('selecionar status "Inativos" chama onFilterChange com active: "false"', async () => {
    const onFilterChange = vi.fn()
    render(<SearchFilters onFilterChange={onFilterChange} />)

    act(() => { vi.advanceTimersByTime(300) })
    onFilterChange.mockClear()

    const statusSelect = screen.getByDisplayValue('Todos os status') as HTMLSelectElement

    act(() => {
      statusSelect.value = 'false'
      statusSelect.dispatchEvent(new Event('change', { bubbles: true }))
    })

    act(() => { vi.advanceTimersByTime(300) })

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ active: 'false' }),
    )
  })

  it('onFilterChange é chamado com valores iniciais vazios na montagem', () => {
    const onFilterChange = vi.fn()
    render(<SearchFilters onFilterChange={onFilterChange} />)

    act(() => { vi.advanceTimersByTime(300) })

    expect(onFilterChange).toHaveBeenCalledWith({ search: '', method: '', active: '' })
  })

  it('não chama onFilterChange antes do debounce expirar', () => {
    const onFilterChange = vi.fn()
    render(<SearchFilters onFilterChange={onFilterChange} />)

    // Antes do timer inicial expirar
    act(() => { vi.advanceTimersByTime(299) })
    expect(onFilterChange).not.toHaveBeenCalled()
  })
})
