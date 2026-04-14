import { useWorkspaceTool } from '../hooks/useWorkspaceTool'
import { GenericResultRenderer } from '../renderers/GenericResultRenderer'
import { ErrorState, LoadingState } from '../renderers/States'

export function ResearchPage() {
  const { loading, error, blocks, rule } = useWorkspaceTool('etf.profile')
  if (loading) return <LoadingState label="Loading ETF profile…" />
  if (error) return <ErrorState title="Research / ETF" message={error} />
  return (
    <div className="page">
      <h2>Research / ETF</h2>
      <p className="muted">
        Mock tool: <code>etf.profile</code> — adapter <code>{rule.adapterId}</code> (read-only preview). For factor
        exposure mocks, use <code>research.factor_exposure</code> from the catalog after discovery.
      </p>
      <GenericResultRenderer blocks={blocks} />
    </div>
  )
}
