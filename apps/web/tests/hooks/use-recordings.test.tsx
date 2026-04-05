import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRecordings } from '@web/hooks/use-recordings'
import type { RecordingsListResponse } from '@web/types/recording'

vi.mock('@web/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    del: vi.fn(),
  },
}))

import { apiClient } from '@web/lib/api-client'

const mockResponse: RecordingsListResponse = {
  data: [
    {
      id: 'rec-1',
      workspaceId: 'ws-1',
      method: 'GET',
      path: '/api/users',
      requestHeaders: {},
      requestBody: null,
      responseStatus: 200,
      responseBody: '{"ok":true}',
      responseHeaders: {},
      capturedAt: '2026-01-01T00:00:00.000Z',
      groupKey: 'GET:/api/users',
      groupCount: 1,
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
}

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useRecordings', () => {
  it('retorna dados da API corretamente', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useRecordings('my-workspace'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockResponse)
    expect(apiClient.get).toHaveBeenCalledWith('/workspaces/my-workspace/recordings')
  })

  it('loading state inicial é true', () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useRecordings('my-workspace'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('passa filtros como query string', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const { result } = renderHook(
      () => useRecordings('my-workspace', { method: 'GET', limit: 10, offset: 0 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(apiClient.get).toHaveBeenCalledWith(
      '/workspaces/my-workspace/recordings?method=GET&limit=10&offset=0',
    )
  })

  it('não executa query quando slug está vazio', () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useRecordings(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(apiClient.get).not.toHaveBeenCalled()
  })
})
