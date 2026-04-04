import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImportPreviewTable } from '@web/components/import-preview-table'
import type { ImportPreviewItem } from '@web/types/import-export'

const mockPreview: ImportPreviewItem[] = [
  {
    index: 0,
    name: 'Listar users',
    method: 'GET',
    path: '/api/users',
    status: 'new',
    rulesCount: 0,
    errors: [],
  },
  {
    index: 1,
    name: 'Criar user',
    method: 'POST',
    path: '/api/users',
    status: 'conflict',
    existingId: 'abc',
    rulesCount: 2,
    errors: [],
  },
  {
    index: 2,
    name: 'Endpoint ruim',
    method: 'INVALID',
    path: '/bad',
    status: 'invalid',
    rulesCount: 0,
    errors: ['method inválido'],
  },
]

describe('ImportPreviewTable', () => {
  it('renderiza mensagem quando lista está vazia', () => {
    render(<ImportPreviewTable preview={[]} />)
    expect(screen.getByText(/nenhum endpoint encontrado/i)).toBeInTheDocument()
  })

  it('renderiza badge verde "Novo" para itens com status "new"', () => {
    render(<ImportPreviewTable preview={[mockPreview[0]]} />)
    const badge = screen.getByText('Novo')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toMatch(/bg-green-100/)
    expect(badge.className).toMatch(/text-green-800/)
  })

  it('renderiza badge amarelo "Conflito" para itens com status "conflict"', () => {
    render(<ImportPreviewTable preview={[mockPreview[1]]} />)
    const badge = screen.getByText('Conflito')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toMatch(/bg-yellow-100/)
    expect(badge.className).toMatch(/text-yellow-800/)
  })

  it('renderiza badge vermelho "Inválido" para itens com status "invalid" e exibe erros', () => {
    render(<ImportPreviewTable preview={[mockPreview[2]]} />)
    const badge = screen.getByText('Inválido')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toMatch(/bg-red-100/)
    expect(badge.className).toMatch(/text-red-800/)
    expect(screen.getByText('method inválido')).toBeInTheDocument()
  })

  it('renderiza método e path de cada item', () => {
    render(<ImportPreviewTable preview={mockPreview} />)
    expect(screen.getByText('GET')).toBeInTheDocument()
    expect(screen.getByText('POST')).toBeInTheDocument()
    expect(screen.getByText('INVALID')).toBeInTheDocument()
    expect(screen.getAllByText('/api/users')).toHaveLength(2)
    expect(screen.getByText('/bad')).toBeInTheDocument()
  })

  it('mostra a contagem de regras (rulesCount) de cada item', () => {
    render(<ImportPreviewTable preview={mockPreview} />)
    // Item 0 has rulesCount 0, item 1 has rulesCount 2, item 2 has rulesCount 0
    const cells = screen.getAllByText('2')
    expect(cells.length).toBeGreaterThanOrEqual(1)
  })

  it('exibe travessão (—) na coluna de erros quando não há erros', () => {
    render(<ImportPreviewTable preview={[mockPreview[0]]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renderiza todos os nomes dos itens', () => {
    render(<ImportPreviewTable preview={mockPreview} />)
    expect(screen.getByText('Listar users')).toBeInTheDocument()
    expect(screen.getByText('Criar user')).toBeInTheDocument()
    expect(screen.getByText('Endpoint ruim')).toBeInTheDocument()
  })
})
