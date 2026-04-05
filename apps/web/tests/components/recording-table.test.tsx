import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecordingTable } from '@web/components/recording-table'
import type { RecordedInteraction } from '@web/types/recording'

const baseRecording: RecordedInteraction = {
  id: 'rec-1',
  workspaceId: 'ws-1',
  method: 'GET',
  path: '/api/users',
  requestHeaders: { 'content-type': 'application/json' },
  requestBody: null,
  responseStatus: 200,
  responseBody: '{"ok":true}',
  responseHeaders: {},
  capturedAt: '2026-01-01T00:00:00.000Z',
  groupKey: 'GET:/api/users',
  groupCount: 1,
}

const recordings: RecordedInteraction[] = [
  baseRecording,
  {
    ...baseRecording,
    id: 'rec-2',
    method: 'POST',
    path: '/api/posts',
    groupKey: 'POST:/api/posts',
    groupCount: 3,
  },
]

function renderTable(overrides: Partial<Parameters<typeof RecordingTable>[0]> = {}) {
  const props = {
    recordings,
    selectedIds: [],
    onSelectionChange: vi.fn(),
    onView: vi.fn(),
    onDiscard: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  }
  return { ...render(<RecordingTable {...props} />), props }
}

describe('RecordingTable', () => {
  it('renderiza lista de gravações', () => {
    renderTable()

    expect(screen.getByText('/api/users')).toBeInTheDocument()
    expect(screen.getByText('/api/posts')).toBeInTheDocument()
    expect(screen.getByText('GET')).toBeInTheDocument()
    expect(screen.getByText('POST')).toBeInTheDocument()
  })

  it('badge "N capturas" aparece quando groupCount > 1', () => {
    renderTable()

    expect(screen.getByText('3 capturas')).toBeInTheDocument()
    expect(screen.queryByText('1 capturas')).not.toBeInTheDocument()
  })

  it('checkbox seleciona uma gravação individual', async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    renderTable({ onSelectionChange })

    const checkboxes = screen.getAllByRole('checkbox')
    // primeiro checkbox é o "selecionar todos", os demais são individuais
    await user.click(checkboxes[1])

    expect(onSelectionChange).toHaveBeenCalledWith(['rec-1'])
  })

  it('checkbox "selecionar todos" seleciona todas as gravações', async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    renderTable({ onSelectionChange })

    const selectAll = screen.getByRole('checkbox', { name: /selecionar todos/i })
    await user.click(selectAll)

    expect(onSelectionChange).toHaveBeenCalledWith(['rec-1', 'rec-2'])
  })

  it('checkbox "selecionar todos" desmarca quando todas estão selecionadas', async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    renderTable({ selectedIds: ['rec-1', 'rec-2'], onSelectionChange })

    const selectAll = screen.getByRole('checkbox', { name: /selecionar todos/i })
    await user.click(selectAll)

    expect(onSelectionChange).toHaveBeenCalledWith([])
  })

  it('callback onView é chamado ao clicar em "Ver detalhes"', async () => {
    const user = userEvent.setup()
    const onView = vi.fn()
    renderTable({ onView })

    const buttons = screen.getAllByRole('button', { name: /ver detalhes/i })
    await user.click(buttons[0])

    expect(onView).toHaveBeenCalledWith(recordings[0])
  })

  it('callback onDiscard é chamado ao clicar em "Descartar"', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    renderTable({ onDiscard })

    const buttons = screen.getAllByRole('button', { name: /descartar/i })
    await user.click(buttons[0])

    expect(onDiscard).toHaveBeenCalledWith('rec-1')
  })

  it('callback onSave é chamado ao clicar em "Salvar como mock"', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderTable({ onSave })

    const buttons = screen.getAllByRole('button', { name: /salvar como mock/i })
    await user.click(buttons[0])

    expect(onSave).toHaveBeenCalledWith(recordings[0])
  })

  it('exibe mensagem quando não há gravações', () => {
    render(
      <RecordingTable
        recordings={[]}
        selectedIds={[]}
        onSelectionChange={vi.fn()}
        onView={vi.fn()}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByText(/nenhuma gravação encontrada/i)).toBeInTheDocument()
  })
})
