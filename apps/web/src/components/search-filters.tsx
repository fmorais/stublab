import { useState, useEffect } from 'react'
import type { HttpMethod } from '@web/types/endpoint'

interface SearchFiltersProps {
  onFilterChange: (filters: {
    search: string
    method: HttpMethod | ''
    active: '' | 'true' | 'false'
  }) => void
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export function SearchFilters({ onFilterChange }: SearchFiltersProps) {
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState<HttpMethod | ''>('')
  const [active, setActive] = useState<'' | 'true' | 'false'>('')

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ search, method, active })
    }, 300)
    return () => clearTimeout(timer)
  }, [search, method, active, onFilterChange])

  return (
    <div className="flex gap-3 flex-wrap">
      <input
        type="text"
        placeholder="Buscar por nome ou path..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value as HttpMethod | '')}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Todos os métodos</option>
        {HTTP_METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={active}
        onChange={(e) => setActive(e.target.value as '' | 'true' | 'false')}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Todos os status</option>
        <option value="true">Ativos</option>
        <option value="false">Inativos</option>
      </select>
    </div>
  )
}
