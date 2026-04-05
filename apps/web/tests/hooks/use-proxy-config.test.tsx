import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProxyConfig } from '@web/hooks/use-proxy-config'
import type { ProxyConfig } from '@web/hooks/use-proxy-config'

vi.mock('@web/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

import { apiClient } from '@web/lib/api-client'

const mockProxyConfig: ProxyConfig = {
  globallyEnabled: true,
  timeoutMs: 5000,
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

describe('useProxyConfig', () => {
  it('retorna dados da API corretamente', async () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockProxyConfig)

    const { result } = renderHook(() => useProxyConfig(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockProxyConfig)
    expect(apiClient.get).toHaveBeenCalledWith('/config/proxy')
  })

  it('loading state inicial é true', () => {
    ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockProxyConfig)

    const { result } = renderHook(() => useProxyConfig(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)
  })
})
