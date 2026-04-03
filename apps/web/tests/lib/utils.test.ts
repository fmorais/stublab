import { describe, it, expect } from 'vitest'
import { cn } from '@web/lib/utils'

describe('cn', () => {
  it('retorna uma string simples sem modificações', () => {
    expect(cn('text-red-500')).toBe('text-red-500')
  })

  it('concatena múltiplas strings separando por espaço', () => {
    expect(cn('px-4', 'py-2', 'rounded')).toBe('px-4 py-2 rounded')
  })

  it('inclui classe quando condição é truthy', () => {
    const result = cn('base', true && 'active')
    expect(result).toContain('active')
    expect(result).toContain('base')
  })

  it('omite classe quando condição é falsy', () => {
    const result = cn('base', false && 'never')
    expect(result).not.toContain('never')
    expect(result).toBe('base')
  })

  it('omite classe quando condição é null', () => {
    const result = cn('base', null)
    expect(result).toBe('base')
  })

  it('omite classe quando condição é undefined', () => {
    const result = cn('base', undefined)
    expect(result).toBe('base')
  })

  it('resolve conflito de padding: p-4 sobrepõe p-2', () => {
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
    expect(result).not.toContain('p-2')
  })

  it('resolve conflito de texto: text-sm sobrepõe text-lg', () => {
    const result = cn('text-lg', 'text-sm')
    expect(result).toBe('text-sm')
    expect(result).not.toContain('text-lg')
  })

  it('resolve conflito de cor de fundo quando passados em ordem', () => {
    const result = cn('bg-red-500', 'bg-blue-500')
    expect(result).toBe('bg-blue-500')
    expect(result).not.toContain('bg-red-500')
  })

  it('aceita objeto com condições clsx', () => {
    const result = cn({ 'font-bold': true, 'font-normal': false })
    expect(result).toContain('font-bold')
    expect(result).not.toContain('font-normal')
  })

  it('aceita array de classes', () => {
    const result = cn(['px-2', 'py-1'])
    expect(result).toContain('px-2')
    expect(result).toContain('py-1')
  })

  it('retorna string vazia quando nenhum argumento é passado', () => {
    expect(cn()).toBe('')
  })
})
