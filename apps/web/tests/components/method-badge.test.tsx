import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MethodBadge } from '@web/components/method-badge'

describe('MethodBadge', () => {
  it('renderiza "GET" com classes de cor verde', () => {
    render(<MethodBadge method="GET" />)
    const badge = screen.getByText('GET')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-green-100')
    expect(badge.className).toContain('text-green-800')
  })

  it('renderiza "POST" com classes de cor azul', () => {
    render(<MethodBadge method="POST" />)
    const badge = screen.getByText('POST')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-blue-100')
    expect(badge.className).toContain('text-blue-800')
  })

  it('renderiza "PUT" com classes de cor amarela', () => {
    render(<MethodBadge method="PUT" />)
    const badge = screen.getByText('PUT')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-yellow-100')
    expect(badge.className).toContain('text-yellow-800')
  })

  it('renderiza "PATCH" com classes de cor laranja', () => {
    render(<MethodBadge method="PATCH" />)
    const badge = screen.getByText('PATCH')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-orange-100')
    expect(badge.className).toContain('text-orange-800')
  })

  it('renderiza "DELETE" com classes de cor vermelha', () => {
    render(<MethodBadge method="DELETE" />)
    const badge = screen.getByText('DELETE')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-red-100')
    expect(badge.className).toContain('text-red-800')
  })

  it('renderiza todos os 5 métodos sem erro', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
    methods.forEach((method) => {
      const { unmount } = render(<MethodBadge method={method} />)
      expect(screen.getByText(method)).toBeInTheDocument()
      unmount()
    })
  })
})
