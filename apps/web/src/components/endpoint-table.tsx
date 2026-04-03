import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MethodBadge } from './method-badge'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { useToggleEndpoint } from '@web/hooks/use-toggle-endpoint'
import { useDeleteEndpoint } from '@web/hooks/use-delete-endpoint'
import type { Endpoint } from '@web/types/endpoint'

interface EndpointTableProps {
  endpoints: Endpoint[]
}

export function EndpointTable({ endpoints }: EndpointTableProps) {
  const navigate = useNavigate()
  const toggleMutation = useToggleEndpoint()
  const deleteMutation = useDeleteEndpoint()

  const [deleteTarget, setDeleteTarget] = useState<Endpoint | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  return (
    <>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-left font-medium">Método</th>
              <th className="px-4 py-3 text-left font-medium">Path</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Ativo</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {endpoints.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Nenhum endpoint cadastrado
                </td>
              </tr>
            )}
            {endpoints.map((ep) => (
              <tr key={ep.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{ep.name}</td>
                <td className="px-4 py-3">
                  <MethodBadge method={ep.method} />
                </td>
                <td className="px-4 py-3 font-mono text-gray-600">{ep.path}</td>
                <td className="px-4 py-3 text-gray-600">{ep.responseStatus}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    role="switch"
                    aria-checked={ep.active}
                    onClick={() => {
                      setTogglingId(ep.id)
                      toggleMutation.mutate(ep.id, { onSettled: () => setTogglingId(null) })
                    }}
                    disabled={togglingId === ep.id}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                      ep.active ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        ep.active ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => navigate(`/endpoints/${ep.id}/edit`)}
                      className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteTarget(ep)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Deletar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        endpointName={deleteTarget?.name ?? ''}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            })
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </>
  )
}
