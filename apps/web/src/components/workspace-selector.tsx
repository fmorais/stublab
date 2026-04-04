import { Link } from 'react-router-dom'

interface WorkspaceSelectorProps {
  workspaceName: string
}

export function WorkspaceSelector({ workspaceName }: WorkspaceSelectorProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
        Workspaces
      </Link>
      <span className="text-muted-foreground">/</span>
      <span className="font-medium text-foreground">{workspaceName}</span>
    </nav>
  )
}
