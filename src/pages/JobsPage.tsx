import { useWorkspaceTool } from '../hooks/useWorkspaceTool'
import { GenericResultRenderer } from '../renderers/GenericResultRenderer'
import { ErrorState, LoadingState } from '../renderers/States'

export function JobsPage() {
  const { loading, error, blocks, rule } = useWorkspaceTool('jobs.recent')
  if (loading) return <LoadingState label="Loading jobs & logs…" />
  if (error) return <ErrorState title="Jobs & Logs" message={error} />
  return (
    <div className="page">
      <h2>Jobs & logs</h2>
      <p className="muted">
        Mock tool: <code>jobs.recent</code> — adapter <code>{rule.adapterId}</code> (read-only preview).
      </p>
      <GenericResultRenderer blocks={blocks} />
    </div>
  )
}
