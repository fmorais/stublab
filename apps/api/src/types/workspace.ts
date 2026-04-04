export interface Workspace {
  id: string
  name: string
  slug: string
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
}

export interface WorkspaceWithStats extends Workspace {
  endpointCount: number
  activeEndpointCount: number
}
