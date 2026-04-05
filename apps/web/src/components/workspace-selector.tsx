import { Link } from 'react-router-dom'
import { Badge } from '@web/components/ui/badge'
import { ArrowUpRight, Circle } from 'lucide-react'

interface WorkspaceSelectorProps {
  workspaceName: string
  proxyEnabled?: boolean
  proxyUrl?: string | null
  recordEnabled?: boolean
}

export function WorkspaceSelector({ workspaceName, proxyEnabled, proxyUrl, recordEnabled }: WorkspaceSelectorProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
        Workspaces
      </Link>
      <span className="text-muted-foreground">/</span>
      <span className="font-medium text-foreground">{workspaceName}</span>
      {proxyEnabled && proxyUrl && (
        <Badge variant="secondary" className="text-xs gap-1">
          <ArrowUpRight className="w-3 h-3" />
          Proxy ativo
        </Badge>
      )}
      {recordEnabled && (
        <Badge variant="destructive" className="text-xs gap-1">
          <Circle className="w-2 h-2 fill-current animate-pulse" />
          Gravando
        </Badge>
      )}
    </nav>
  )
}
