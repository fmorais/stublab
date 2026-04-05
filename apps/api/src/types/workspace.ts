export interface Workspace {
  id: string
  name: string
  slug: string
  proxyUrl: string | null
  proxyEnabled: boolean
  createdAt: string
  updatedAt: string
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
}

export interface WorkspaceWithStats extends Workspace {
  endpointCount: number
  activeEndpointCount: number
}
