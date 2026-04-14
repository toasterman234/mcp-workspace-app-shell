import type { MetricGroupModel } from '../results/types'
import { MetricsGridRenderer } from './MetricsGridRenderer'

export function MetricGroupsRenderer({ groups }: { groups: MetricGroupModel[] }) {
  return (
    <div className="metric-groups">
      {groups.map((g) => (
        <section key={g.id} className="panel metric-group">
          <h4 className="metric-group__title">{g.title}</h4>
          <MetricsGridRenderer metrics={g.metrics} />
        </section>
      ))}
    </div>
  )
}
