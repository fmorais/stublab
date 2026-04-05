import { cn } from '@web/lib/utils'
import type { RecordedInteraction } from '@web/types/recording'

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-green-100 text-green-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  PATCH: 'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

interface RecordingTableProps {
  recordings: RecordedInteraction[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onView: (recording: RecordedInteraction) => void
  onDiscard: (id: string) => void
  onSave: (recording: RecordedInteraction) => void
}

export function RecordingTable({
  recordings,
  selectedIds,
  onSelectionChange,
  onView,
  onDiscard,
  onSave,
}: RecordingTableProps) {
  const allSelected = recordings.length > 0 && selectedIds.length === recordings.length

  function toggleAll() {
    if (allSelected) {
      onSelectionChange([])
    } else {
      onSelectionChange(recordings.map((r) => r.id))
    }
  }

  function toggleOne(id: string) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  if (recordings.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
        Nenhuma gravação encontrada.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-10 px-3 py-2 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Selecionar todos"
                className="cursor-pointer"
              />
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Método</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Path</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Capturas</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Capturado em</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {recordings.map((recording) => (
            <tr
              key={recording.id}
              className={cn('border-b last:border-b-0 hover:bg-muted/30 transition-colors', {
                'bg-muted/20': selectedIds.includes(recording.id),
              })}
            >
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(recording.id)}
                  onChange={() => toggleOne(recording.id)}
                  aria-label={`Selecionar ${recording.method} ${recording.path}`}
                  className="cursor-pointer"
                />
              </td>
              <td className="px-3 py-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold',
                    METHOD_STYLES[recording.method] ?? 'bg-gray-100 text-gray-800',
                  )}
                >
                  {recording.method}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{recording.path}</td>
              <td className="px-3 py-2">
                <span
                  className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold', {
                    'bg-green-100 text-green-800': recording.responseStatus < 300,
                    'bg-yellow-100 text-yellow-800':
                      recording.responseStatus >= 300 && recording.responseStatus < 400,
                    'bg-red-100 text-red-800': recording.responseStatus >= 400,
                  })}
                >
                  {recording.responseStatus}
                </span>
              </td>
              <td className="px-3 py-2">
                {recording.groupCount > 1 ? (
                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
                    {recording.groupCount} capturas
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{formatDate(recording.capturedAt)}</td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onView(recording)}
                    className="rounded px-2 py-1 text-xs hover:bg-muted transition-colors"
                  >
                    Ver detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => onDiscard(recording.id)}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={() => onSave(recording)}
                    className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Salvar como mock
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
