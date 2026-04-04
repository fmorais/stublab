import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@uiw/react-codemirror', () => ({
  default: ({
    value,
    onChange,
    className,
    style,
  }: {
    value: string
    onChange: (v: string) => void
    className?: string
    style?: React.CSSProperties
  }) => (
    <textarea
      data-testid="codemirror-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={style}
    />
  ),
}))

import { JsonEditor } from '@web/components/json-editor'

describe('JsonEditor', () => {
  it('renderiza com o valor inicial fornecido', () => {
    render(<JsonEditor value='{"hello": "world"}' onChange={vi.fn()} />)
    const editor = screen.getByTestId('codemirror-editor') as HTMLTextAreaElement
    expect(editor.value).toBe('{"hello": "world"}')
  })

  it('chama onChange quando o valor é alterado', () => {
    const onChange = vi.fn()
    render(<JsonEditor value="" onChange={onChange} />)

    const editor = screen.getByTestId('codemirror-editor')
    fireEvent.change(editor, { target: { value: '{"a": 1}' } })

    expect(onChange).toHaveBeenCalledWith('{"a": 1}')
  })

  it('aplica classe de erro quando hasError é true', () => {
    render(<JsonEditor value="{}" onChange={vi.fn()} hasError />)

    const editor = screen.getByTestId('codemirror-editor')
    // The border wrapper is the div directly containing the CodeMirror mock
    const borderWrapper = editor.parentElement as HTMLElement
    expect(borderWrapper?.className).toMatch(/border-destructive/)
  })

  it('formata JSON válido ao clicar no botão Formatar', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<JsonEditor value='{"a":1,"b":2}' onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /formatar/i }))

    expect(onChange).toHaveBeenCalledWith(JSON.stringify({ a: 1, b: 2 }, null, 2))
  })

  it('não chama onChange ao clicar em Formatar com JSON inválido', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<JsonEditor value="invalid json" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /formatar/i }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('aplica minHeight e maxHeight no wrapper div', () => {
    render(<JsonEditor value="{}" onChange={vi.fn()} minHeight={150} maxHeight={300} />)

    const editor = screen.getByTestId('codemirror-editor')
    // Walk up to find the div with inline style containing minHeight/maxHeight
    const borderWrapper = editor.parentElement as HTMLElement
    expect(borderWrapper?.style.minHeight).toBe('150px')
    expect(borderWrapper?.style.maxHeight).toBe('300px')
  })
})
