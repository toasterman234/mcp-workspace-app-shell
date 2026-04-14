import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartModel } from '../mcp/normalize/types'

/** v1: renders the first series cleanly; extend for multi-series alignment when needed. */
export function ChartRenderer({ chart }: { chart: ChartModel }) {
  const primary = chart.series[0]
  if (!primary) return null
  const data = primary.data.map((p) => ({ x: String(p.x), y: p.y }))

  return (
    <div className="panel chart-panel">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="x" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} width={56} />
          <Tooltip
            contentStyle={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          />
          <Line
            type="monotone"
            dataKey="y"
            name={primary.name}
            stroke="var(--accent)"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
