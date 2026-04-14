import type { KpiModel } from '../mcp/normalize/types'

export function KpiCardsRenderer({ kpis }: { kpis: KpiModel[] }) {
  return (
    <div className="kpi-grid">
      {kpis.map((k) => (
        <div key={k.label} className={`kpi-card kpi-card--${k.tone ?? 'neutral'}`}>
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-value">{k.value}</div>
          {k.delta ? <div className="kpi-delta">{k.delta}</div> : null}
        </div>
      ))}
    </div>
  )
}
