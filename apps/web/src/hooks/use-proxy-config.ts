import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@web/lib/api-client'

export interface ProxyConfig {
  globallyEnabled: boolean
  timeoutMs: number
}

export function useProxyConfig() {
  return useQuery<ProxyConfig>({
    queryKey: ['config', 'proxy'],
    queryFn: () => apiClient.get<ProxyConfig>('/config/proxy'),
    staleTime: 5 * 60 * 1000,
  })
}
