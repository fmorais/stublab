import { cn } from '@web/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@web/components/ui/dialog'
import { Button } from '@web/components/ui/button'
import type { RecordedInteraction } from '@web/types/recording'

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-green-100 text-green-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  PATCH: 'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

function formatJson(value: unknown): string {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  if (value === null || value === undefined) return ''
  return JSON.stringify(value, null, 2)
}

interface RecordingDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recording: RecordedInteraction | null
}

export function RecordingDetailDialog({ open, onOpenChange, recording }: RecordingDetailDialogProps) {
  if (!recording) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold',
                METHOD_STYLES[recording.method] ?? 'bg-gray-100 text-gray-800',
              )}
            >
              {recording.method}
            </span>
            <span className="font-mono text-sm font-normal">{recording.path}</span>
            <span
              className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold', {
                'bg-green-100 text-green-800': recording.responseStatus < 300,
                'bg-yellow-100 text-yellow-800':
                  recording.responseStatus >= 300 && recording.responseStatus < 400,
                'bg-red-100 text-red-800': recording.responseStatus >= 400,
              })}
            >
              {recording.responseStatus}
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {formatDate(recording.capturedAt)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <section>
            <h3 className="text-sm font-medium mb-1.5">Request Headers</h3>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
              {formatJson(recording.requestHeaders)}
            </pre>
          </section>

          <section>
            <h3 className="text-sm font-medium mb-1.5">Request Body</h3>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
              {recording.requestBody ? formatJson(recording.requestBody) : <span className="text-muted-foreground italic">vazio</span>}
            </pre>
          </section>

          <section>
            <h3 className="text-sm font-medium mb-1.5">Response Headers</h3>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
              {formatJson(recording.responseHeaders)}
            </pre>
          </section>

          <section>
            <h3 className="text-sm font-medium mb-1.5">Response Body</h3>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
              {recording.responseBody ? formatJson(recording.responseBody) : <span className="text-muted-foreground italic">vazio</span>}
            </pre>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
