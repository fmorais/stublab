import { FileJson2, Send, FileCode2 } from 'lucide-react'
import type { ImportSource } from '@web/types/import-external'

interface ImportSourceSelectorProps {
  value: ImportSource
  onChange: (source: ImportSource) => void
}

interface SourceOption {
  value: ImportSource
  icon: React.ReactNode
  title: string
  description: string
}

const OPTIONS: SourceOption[] = [
  {
    value: 'stublab',
    icon: <FileJson2 className="w-5 h-5" />,
    title: 'StubLab (.json)',
    description: 'Arquivo exportado pelo StubLab',
  },
  {
    value: 'postman',
    icon: <Send className="w-5 h-5" />,
    title: 'Postman Collection (.json)',
    description: 'Coleção exportada do Postman v2.x',
  },
  {
    value: 'openapi',
    icon: <FileCode2 className="w-5 h-5" />,
    title: 'Swagger/OpenAPI (.json/.yaml)',
    description: 'Spec OpenAPI 2.0, 3.0.x ou 3.1.x',
  },
]

export function ImportSourceSelector({ value, onChange }: ImportSourceSelectorProps) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Fonte de importação">
      {OPTIONS.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={[
              'w-full flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected
                ? 'border-primary ring-2 ring-primary bg-primary/5'
                : 'border-input hover:bg-muted/50',
            ].join(' ')}
          >
            <span
              className={[
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                isSelected ? 'border-primary' : 'border-muted-foreground',
              ].join(' ')}
            >
              {isSelected && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </span>
            <span
              className={[
                'flex shrink-0 items-center justify-center',
                isSelected ? 'text-primary' : 'text-muted-foreground',
              ].join(' ')}
            >
              {option.icon}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{option.title}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
