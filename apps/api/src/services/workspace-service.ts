import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { workspaces, endpoints } from '../db/schema.js'
import type { Workspace, CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceWithStats } from '../types/workspace.js'

export class WorkspaceServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'SLUG_CONFLICT' | 'DEFAULT_WORKSPACE_PROTECTED',
    message: string,
  ) {
    super(message)
    this.name = 'WorkspaceServiceError'
  }
}

function rowToWorkspace(row: typeof workspaces.$inferSelect): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    proxyUrl: row.proxyUrl ?? null,
    proxyEnabled: row.proxyEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function getStats(workspaceId: string): Promise<{ endpointCount: number; activeEndpointCount: number }> {
  const rows = await db
    .select({ id: endpoints.id, active: endpoints.active })
    .from(endpoints)
    .where(eq(endpoints.workspaceId, workspaceId))
  return {
    endpointCount: rows.length,
    activeEndpointCount: rows.filter((r) => r.active).length,
  }
}

export const WorkspaceService = {
  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, input.slug))
    if (existing) {
      throw new WorkspaceServiceError('SLUG_CONFLICT', `Slug '${input.slug}' já está em uso`)
    }

    const now = new Date().toISOString()
    const id = uuidv4()
    await db.insert(workspaces).values({ id, name: input.name, slug: input.slug, createdAt: now, updatedAt: now })
    const [created] = await db.select().from(workspaces).where(eq(workspaces.id, id))
    return rowToWorkspace(created)
  },

  async findAll(): Promise<WorkspaceWithStats[]> {
    const rows = await db.select().from(workspaces)
    const result: WorkspaceWithStats[] = []
    for (const row of rows) {
      const stats = await getStats(row.id)
      result.push({ ...rowToWorkspace(row), ...stats })
    }
    return result
  },

  async findBySlug(slug: string): Promise<WorkspaceWithStats | null> {
    const [row] = await db.select().from(workspaces).where(eq(workspaces.slug, slug))
    if (!row) return null
    const stats = await getStats(row.id)
    return { ...rowToWorkspace(row), ...stats }
  },

  async update(slug: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    const [existing] = await db.select().from(workspaces).where(eq(workspaces.slug, slug))
    if (!existing) {
      throw new WorkspaceServiceError('NOT_FOUND', `Workspace '${slug}' não encontrado`)
    }

    if (input.slug && input.slug !== slug) {
      const [conflict] = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, input.slug))
      if (conflict) {
        throw new WorkspaceServiceError('SLUG_CONFLICT', `Slug '${input.slug}' já está em uso`)
      }
    }

    const now = new Date().toISOString()
    await db
      .update(workspaces)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.proxyUrl !== undefined && { proxyUrl: input.proxyUrl }),
        ...(input.proxyEnabled !== undefined && { proxyEnabled: input.proxyEnabled }),
        updatedAt: now,
      })
      .where(eq(workspaces.id, existing.id))

    const [updated] = await db.select().from(workspaces).where(eq(workspaces.id, existing.id))
    return rowToWorkspace(updated)
  },

  async delete(slug: string): Promise<void> {
    if (slug === 'default') {
      throw new WorkspaceServiceError(
        'DEFAULT_WORKSPACE_PROTECTED',
        'O workspace "default" não pode ser deletado',
      )
    }
    const [existing] = await db.select().from(workspaces).where(eq(workspaces.slug, slug))
    if (!existing) {
      throw new WorkspaceServiceError('NOT_FOUND', `Workspace '${slug}' não encontrado`)
    }
    await db.delete(workspaces).where(eq(workspaces.id, existing.id))
  },
}
