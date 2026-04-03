import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchFilters } from '@web/components/search-filters'
import { EndpointTable } from '@web/components/endpoint-table'
import { useEndpoints } from '@web/hooks/use-endpoints'
import type { HttpMethod } from '@web/types/endpoint'

interface Filters {
  search: string
  method: HttpMethod | ''
  active: '' | 'true' | 'false'
}

export function EndpointsList() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Filters>({ search: '', method: '', active: '' })

  const { data, isLoading, error } = useEndpoints({
    search: filters.search || undefined,
    method: filters.method || undefined,
    active: filters.active === '' ? undefined : filters.active === 'true',
  })

  const handleFilterChange = useCallback((f: Filters) => setFilters(f), [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Endpoints</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} endpoint{data?.total !== 1 ? 's' : ''} cadastrado{data?.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/endpoints/new')}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Novo endpoint
        </button>
      </div>

      <SearchFilters onFilterChange={handleFilterChange} />

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Erro ao carregar endpoints. Verifique se a API está rodando.
        </div>
      )}

      {!isLoading && !error && (
        <EndpointTable endpoints={data?.data ?? []} />
      )}
    </div>
  )
}
