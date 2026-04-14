import type { MetricCell } from '../mcp/normalize/types'

export function MetricsGridRenderer({ metrics }: { metrics: MetricCell[] }) {
  return (
    <div className="metrics-grid">
      {metrics.map((m) => (
        <div key={m.id} className="metric-cell">
          <div className="metric-label">{m.label}</div>
          <div className="metric-value">{m.value}</div>
          {m.sublabel ? <div className="metric-sub">{m.sublabel}</div> : null}
        </div>
      ))}
    </div>
  )
}
