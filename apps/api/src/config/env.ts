export function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue
  return value.toLowerCase() !== 'false' && value !== '0'
}

export function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

export const env = {
  proxyEnabled: parseBoolean(process.env.PROXY_ENABLED, true),
  proxyTimeoutMs: parseNumber(process.env.PROXY_TIMEOUT_MS, 10000),
} as const

export function isProxyGloballyEnabled(): boolean {
  return env.proxyEnabled
}

export function getProxyTimeoutMs(): number {
  return env.proxyTimeoutMs
}
