import type { ImportPreviewItem } from '@web/types/import-export'
import { MethodBadge } from '@web/components/method-badge'
import type { HttpMethod } from '@web/types/endpoint'

interface ImportPreviewTableProps {
  preview: ImportPreviewItem[]
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

export function ImportPreviewTable({ preview }: ImportPreviewTableProps) {
  if (preview.length === 0) {
    return (
      <div className="rounded-md border border-input py-8 text-center">
        <p className="text-sm text-muted-foreground">Nenhum endpoint encontrado no arquivo.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-input overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-input">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Método</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Path</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Regras</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Erros</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-input">
          {preview.map((item) => (
            <tr key={item.index} className="hover:bg-muted/30 transition-colors">
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
