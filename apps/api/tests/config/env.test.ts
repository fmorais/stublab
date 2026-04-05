import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('parseBoolean', () => {
  it('retorna o defaultValue quando env não está definida', async () => {
    const { parseBoolean } = await import('../../src/config/env.js')
    expect(parseBoolean(undefined, true)).toBe(true)
    expect(parseBoolean(undefined, false)).toBe(false)
  })

  it('retorna false para "false"', async () => {
    const { parseBoolean } = await import('../../src/config/env.js')
    expect(parseBoolean('false', true)).toBe(false)
  })

  it('retorna false para "0"', async () => {
    const { parseBoolean } = await import('../../src/config/env.js')
    expect(parseBoolean('0', true)).toBe(false)
  })

  it('retorna true para "true"', async () => {
    const { parseBoolean } = await import('../../src/config/env.js')
    expect(parseBoolean('true', false)).toBe(true)
  })

  it('retorna true para "1"', async () => {
    const { parseBoolean } = await import('../../src/config/env.js')
    expect(parseBoolean('1', false)).toBe(true)
  })

  it('retorna true para qualquer string diferente de "false"/"0"', async () => {
    const { parseBoolean } = await import('../../src/config/env.js')
    expect(parseBoolean('yes', false)).toBe(true)
  })
})

describe('parseNumber', () => {
  it('retorna o defaultValue quando env não está definida', async () => {
    const { parseNumber } = await import('../../src/config/env.js')
    expect(parseNumber(undefined, 5000)).toBe(5000)
  })

  it('parseia um número inteiro válido', async () => {
    const { parseNumber } = await import('../../src/config/env.js')
    expect(parseNumber('3000', 5000)).toBe(3000)
  })

  it('retorna defaultValue para string não-numérica', async () => {
    const { parseNumber } = await import('../../src/config/env.js')
    expect(parseNumber('abc', 5000)).toBe(5000)
  })

  it('retorna defaultValue para string vazia', async () => {
    const { parseNumber } = await import('../../src/config/env.js')
    expect(parseNumber('', 5000)).toBe(5000)
  })
})

describe('isProxyGloballyEnabled / getProxyTimeoutMs', () => {
  it('usa defaults quando vars de ambiente não estão definidas', async () => {
    vi.stubEnv('PROXY_ENABLED', undefined as unknown as string)
    vi.stubEnv('PROXY_TIMEOUT_MS', undefined as unknown as string)
    vi.resetModules()
    const { isProxyGloballyEnabled, getProxyTimeoutMs } = await import('../../src/config/env.js')
    expect(isProxyGloballyEnabled()).toBe(true)
    expect(getProxyTimeoutMs()).toBe(10000)
  })

  it('desativa proxy globalmente quando PROXY_ENABLED=false', async () => {
    vi.stubEnv('PROXY_ENABLED', 'false')
    vi.resetModules()
    const { isProxyGloballyEnabled } = await import('../../src/config/env.js')
    expect(isProxyGloballyEnabled()).toBe(false)
  })

  it('aplica timeout customizado de PROXY_TIMEOUT_MS', async () => {
    vi.stubEnv('PROXY_TIMEOUT_MS', '5000')
    vi.resetModules()
    const { getProxyTimeoutMs } = await import('../../src/config/env.js')
    expect(getProxyTimeoutMs()).toBe(5000)
  })

  it('usa default de 10000ms para PROXY_TIMEOUT_MS inválido', async () => {
    vi.stubEnv('PROXY_TIMEOUT_MS', 'invalid')
    vi.resetModules()
    const { getProxyTimeoutMs } = await import('../../src/config/env.js')
    expect(getProxyTimeoutMs()).toBe(10000)
  })
})
