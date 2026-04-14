import { useWorkspaceTool } from '../hooks/useWorkspaceTool'
import { GenericResultRenderer } from '../renderers/GenericResultRenderer'
import { ErrorState, LoadingState } from '../renderers/States'

export function ScannersPage() {
  const { loading, error, blocks, rule } = useWorkspaceTool('scanner.rank')
  if (loading) return <LoadingState label="Loading scanner results…" />
  if (error) return <ErrorState title="Scanners" message={error} />
  return (
    <div className="page">
      <h2>Scanners</h2>
      <p className="muted">
        Mock tool: <code>scanner.rank</code> — adapter <code>{rule.adapterId}</code> (read-only preview).
      </p>
      <GenericResultRenderer blocks={blocks} />
    </div>
  )
}
