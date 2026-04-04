import type { WorkspaceWithStats } from '@web/types/workspace'

interface WorkspaceCardProps {
  workspace: WorkspaceWithStats
  onClick: () => void
}

export function WorkspaceCard({ workspace, onClick }: WorkspaceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-input bg-card p-5 text-left shadow-sm transition-colors hover:border-ring hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-card-foreground truncate">{workspace.name}</h3>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">{workspace.slug}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium text-card-foreground">{workspace.endpointCount}</p>
          <p className="text-xs text-muted-foreground">endpoints</p>
        </div>
      </div>
      {workspace.endpointCount > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          {workspace.activeEndpointCount} ativo{workspace.activeEndpointCount !== 1 ? 's' : ''}
          {' · '}
          {workspace.endpointCount - workspace.activeEndpointCount} inativo{workspace.endpointCount - workspace.activeEndpointCount !== 1 ? 's' : ''}
        </p>
      )}
    </button>
  )
}
