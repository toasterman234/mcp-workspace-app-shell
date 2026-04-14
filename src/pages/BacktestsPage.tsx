import { useWorkspaceTool } from '../hooks/useWorkspaceTool'
import { GenericResultRenderer } from '../renderers/GenericResultRenderer'
import { ErrorState, LoadingState } from '../renderers/States'

export function BacktestsPage() {
  const { loading, error, blocks, rule } = useWorkspaceTool('backtest.run_summary')
  if (loading) return <LoadingState label="Loading backtest summary…" />
  if (error) return <ErrorState title="Backtests" message={error} />
  return (
    <div className="page">
      <h2>Backtests</h2>
      <p className="muted">
        Mock tool: <code>backtest.run_summary</code> — adapter <code>{rule.adapterId}</code> (read-only preview).
      </p>
      <GenericResultRenderer blocks={blocks} />
    </div>
  )
}
