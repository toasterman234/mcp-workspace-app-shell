import { useWorkspaceTool } from '../hooks/useWorkspaceTool'
import { GenericResultRenderer } from '../renderers/GenericResultRenderer'
import { ErrorState, LoadingState } from '../renderers/States'

export function PortfolioPage() {
  const { loading, error, blocks, rule } = useWorkspaceTool('portfolio.snapshot')
  if (loading) return <LoadingState label="Loading portfolio snapshot…" />
  if (error) return <ErrorState title="Portfolio" message={error} />
  return (
    <div className="page">
      <h2>Portfolio</h2>
      <p className="muted">
        Mock tool: <code>portfolio.snapshot</code> — adapter <code>{rule.adapterId}</code> (read-only preview).
      </p>
      <GenericResultRenderer blocks={blocks} />
    </div>
  )
}
