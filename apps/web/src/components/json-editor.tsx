import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'
import { Code2 } from 'lucide-react'
import { isValidJson } from '@web/lib/json-utils'

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  minHeight?: number
  maxHeight?: number
  readOnly?: boolean
  hasError?: boolean
}

const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
  },
  '.cm-content': {
    caretColor: 'hsl(var(--foreground))',
  },
  '.cm-cursor': {
    borderLeftColor: 'hsl(var(--foreground))',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'hsl(var(--muted))',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--background))',
    border: 'none',
  },
})

export function JsonEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  minHeight = 120,
  maxHeight = 480,
  readOnly = false,
  hasError = false,
}: JsonEditorProps) {
  const canFormat = useMemo(() => isValidJson(value), [value])

  function handleFormat() {
    if (!canFormat) return
    const formatted = JSON.stringify(JSON.parse(value), null, 2)
    onChange(formatted)
  }

  const borderClass = hasError
    ? 'border border-destructive rounded-md overflow-hidden'
    : 'border border-input rounded-md overflow-hidden'

  return (
    <div className="relative">
      <div className="absolute top-1.5 right-2 z-10">
        <button
          type="button"
          onClick={handleFormat}
          disabled={!canFormat}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Formatar JSON"
        >
          <Code2 className="h-3 w-3" />
          Formatar
        </button>
      </div>
      <div
        className={borderClass}
        style={{ minHeight, maxHeight }}
      >
        <CodeMirror
          value={value}
          onChange={onChange}
          extensions={[json(), editorTheme, EditorView.lineWrapping]}
          onBlur={onBlur}
          placeholder={placeholder}
          readOnly={readOnly}
          basicSetup={{ lineNumbers: false, foldGutter: false }}
          style={{ minHeight, maxHeight }}
        />
      </div>
    </div>
  )
}
