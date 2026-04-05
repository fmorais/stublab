import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorkspaceSelector } from '@web/components/workspace-selector'

function renderSelector(props: Parameters<typeof WorkspaceSelector>[0]) {
  return render(
    <MemoryRouter>
      <WorkspaceSelector {...props} />
    </MemoryRouter>,
  )
}

describe('WorkspaceSelector', () => {
  it('renderiza o nome do workspace', () => {
    renderSelector({ workspaceName: 'Meu Workspace' })
    expect(screen.getByText('Meu Workspace')).toBeInTheDocument()
  })

  it('badge "Proxy ativo" aparece quando proxyEnabled=true e proxyUrl não-null', () => {
    renderSelector({
      workspaceName: 'Meu Workspace',
      proxyEnabled: true,
      proxyUrl: 'https://api.example.com',
    })

    expect(screen.getByText('Proxy ativo')).toBeInTheDocument()
  })

  it('badge não aparece quando proxyEnabled=false', () => {
    renderSelector({
      workspaceName: 'Meu Workspace',
      proxyEnabled: false,
      proxyUrl: 'https://api.example.com',
    })

    expect(screen.queryByText('Proxy ativo')).not.toBeInTheDocument()
  })

  it('badge não aparece quando proxyUrl=null', () => {
    renderSelector({
      workspaceName: 'Meu Workspace',
      proxyEnabled: true,
      proxyUrl: null,
    })

    expect(screen.queryByText('Proxy ativo')).not.toBeInTheDocument()
  })

  it('badge não aparece quando proxyEnabled e proxyUrl não são passados', () => {
    renderSelector({ workspaceName: 'Meu Workspace' })

    expect(screen.queryByText('Proxy ativo')).not.toBeInTheDocument()
  })

  it('badge "Gravando" aparece quando recordEnabled=true', () => {
    renderSelector({
      workspaceName: 'Meu Workspace',
      recordEnabled: true,
    })

    expect(screen.getByText('Gravando')).toBeInTheDocument()
  })

  it('badge "Gravando" não aparece quando recordEnabled=false', () => {
    renderSelector({
      workspaceName: 'Meu Workspace',
      recordEnabled: false,
    })

    expect(screen.queryByText('Gravando')).not.toBeInTheDocument()
  })

  it('badge "Gravando" não aparece quando recordEnabled não é passado', () => {
    renderSelector({ workspaceName: 'Meu Workspace' })

    expect(screen.queryByText('Gravando')).not.toBeInTheDocument()
  })
})
