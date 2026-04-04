import type { Endpoint } from '@web/types/endpoint'

interface EndpointTableProps {
  endpoints: Endpoint[]
  togglingId?: string | null
  onEdit?: (endpoint: Endpoint) => void
  onDelete?: (endpoint: Endpoint) => void
  onToggleActive?: (endpoint: Endpoint) => void
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
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
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: EndpointTableProps) {
  const allSelected = endpoints.length > 0 && endpoints.every((ep) => selectedIds.includes(ep.id))
  const someSelected = endpoints.some((ep) => selectedIds.includes(ep.id))

  function handleSelectAll() {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !endpoints.some((ep) => ep.id === id)))
    } else {
      const newIds = [...selectedIds]
      for (const ep of endpoints) {
        if (!newIds.includes(ep.id)) newIds.push(ep.id)
      }
      onSelectionChange(newIds)
    }
  }

  function handleSelectOne(id: string) {
    if (!onSelectionChange) return
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }
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
            {selectable && (
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected
                  }}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
              </th>
            )}
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
              {selectable && (
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${ep.name}`}
                    checked={selectedIds.includes(ep.id)}
                    onChange={() => handleSelectOne(ep.id)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </td>
              )}
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
