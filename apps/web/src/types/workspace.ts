export interface Workspace {
  id: string
  name: string
  slug: string
  proxyUrl: string | null
  proxyEnabled: boolean
  recordEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkspaceWithStats extends Workspace {
  endpointCount: number
  activeEndpointCount: number
}

export interface CreateWorkspaceInput {
  name: string
  slug: string
}

export interface UpdateWorkspaceInput {
  name?: string
  slug?: string
  proxyUrl?: string | null
  proxyEnabled?: boolean
  recordEnabled?: boolean
}
