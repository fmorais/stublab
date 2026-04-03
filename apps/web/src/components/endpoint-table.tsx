import type { Endpoint } from '@web/types/endpoint'

interface EndpointTableProps {
  endpoints: Endpoint[]
  togglingId?: string | null
  onEdit?: (endpoint: Endpoint) => void
  onDelete?: (endpoint: Endpoint) => void
  onToggleActive?: (endpoint: Endpoint) => void
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
}

export function EndpointTable({
  endpoints,
  togglingId,
  onEdit,
  onDelete,
  onToggleActive,
}: EndpointTableProps) {
  if (endpoints.length === 0) {
    return (
      <div className="rounded-md border border-input py-12 text-center">
        <p className="text-sm text-muted-foreground">Nenhum endpoint cadastrado.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-input overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-input">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8">
              Status
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Método</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Path</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">
              Response
            </th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-input">
          {endpoints.map((ep) => (
            <tr key={ep.id} className="hover:bg-muted/30 transition-colors">
              {/* Status ativo/inativo */}
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onToggleActive?.(ep)}
                  disabled={togglingId === ep.id}
                  aria-label={ep.active ? 'Desativar endpoint' : 'Ativar endpoint'}
                  className="flex items-center disabled:opacity-50"
                >
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      ep.active ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                </button>
              </td>

              {/* Nome + badge de regras */}
              <td className="px-4 py-3">
                <span className="font-medium text-foreground">{ep.name}</span>
                {ep.matchingRules.length > 0 && (
                  <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    {ep.matchingRules.length} regra{ep.matchingRules.length !== 1 ? 's' : ''}
                  </span>
                )}
              </td>

              {/* Método */}
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                    METHOD_COLORS[ep.method] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {ep.method}
                </span>
              </td>

              {/* Path */}
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {ep.path}
              </td>

              {/* Status HTTP */}
              <td className="px-4 py-3 text-muted-foreground">{ep.responseStatus}</td>

              {/* Ações */}
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(ep)}
                      className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      Editar
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(ep)}
                      className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
