import type { JsonValue } from '../types'

export type RenderHint =
  | 'table'
  | 'kpis'
  | 'chart'
  | 'metricsGrid'
  | 'filters'
  | 'timeline'
  | 'json'
  | 'auto'

export interface TableModel {
  columns: { key: string; label: string; align?: 'left' | 'right' }[]
  rows: Record<string, string | number | boolean | null>[]
}

export interface KpiModel {
  label: string
  value: string
  delta?: string
  tone?: 'neutral' | 'positive' | 'negative'
}

export interface ChartPoint {
  x: string | number
  y: number
}

export interface ChartModel {
  series: { name: string; data: ChartPoint[] }[]
}

export interface MetricCell {
  id: string
  label: string
  value: string
  sublabel?: string
}

export interface EventModel {
  id: string
  ts: string
  level: 'info' | 'warn' | 'error'
  message: string
  meta?: JsonValue
}

/** Canonical view-model the generic renderers consume. */
export interface NormalizedToolResult {
  title?: string
  hint: RenderHint
  table?: TableModel
  kpis?: KpiModel[]
  chart?: ChartModel
  metrics?: MetricCell[]
  filters?: { id: string; label: string; value: string }[]
  events?: EventModel[]
  /** Always preserve raw for JSON viewer / adapters. */
  raw: JsonValue | undefined
}
