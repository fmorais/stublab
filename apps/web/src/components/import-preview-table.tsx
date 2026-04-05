import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ImportPreviewItem, ExportedEndpoint } from '@web/types/import-export'
import { MethodBadge } from '@web/components/method-badge'
import type { HttpMethod } from '@web/types/endpoint'

interface ImportPreviewTableProps {
  preview: ImportPreviewItem[]
  endpoints?: ExportedEndpoint[]
}

const STATUS_STYLES: Record<ImportPreviewItem['status'], string> = {
  new: 'bg-green-100 text-green-800',
  conflict: 'bg-yellow-100 text-yellow-800',
  invalid: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<ImportPreviewItem['status'], string> = {
  new: 'Novo',
  conflict: 'Conflito',
  invalid: 'Inválido',
}

const KNOWN_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export function ImportPreviewTable({ preview, endpoints }: ImportPreviewTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  function toggleRow(index: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  function canExpand(item: ImportPreviewItem): boolean {
    if (!endpoints) return false
    const endpoint = endpoints[item.index]
    return endpoint !== undefined && endpoint.responseBody !== '' && endpoint.responseBody !== undefined
  }

  if (preview.length === 0) {
    return (
      <div className="rounded-md border border-input py-8 text-center">
        <p className="text-sm text-muted-foreground">Nenhum endpoint encontrado no arquivo.</p>
      </div>
    )
  }

  const hasExpandable = endpoints !== undefined

  return (
    <div className="rounded-md border border-input overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-input">
          <tr>
            {hasExpandable && <th className="w-8 px-2 py-3" />}
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Método</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Path</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Regras</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Erros</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-input">
          {preview.map((item) => {
            const isExpanded = expandedRows.has(item.index)
            const expandable = canExpand(item)
            const endpoint = endpoints?.[item.index]

            return (
              <Fragment key={item.index}>
                <tr
                  className="hover:bg-muted/30 transition-colors"
                >
                  {hasExpandable && (
                    <td className="px-2 py-3">
                      {expandable ? (
                        <button
                          type="button"
                          onClick={() => toggleRow(item.index)}
                          className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <span className="w-5 h-5 block" />
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {KNOWN_METHODS.includes(item.method) ? (
                      <MethodBadge method={item.method as HttpMethod} />
                    ) : (
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700">
                        {item.method}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.path}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[item.status]}`}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.rulesCount}</td>
                  <td className="px-4 py-3">
                    {item.errors.length > 0 ? (
                      <ul className="space-y-0.5">
                        {item.errors.map((err, i) => (
                          <li key={i} className="text-xs text-red-600">
                            {err}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
                {isExpanded && expandable && endpoint && (
                  <tr key={`expanded-${item.index}`} className="bg-muted/20">
                    <td colSpan={hasExpandable ? 7 : 6} className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Resposta ({endpoint.responseStatus})
                        </p>
                        <pre className="rounded-md bg-muted px-3 py-2 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-words max-h-48">
                          {endpoint.responseBody}
                        </pre>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
