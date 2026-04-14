import type { JsonValue } from '../mcp/types'
import type {
  ChartModel,
  EventModel,
  KpiModel,
  MetricCell,
  TableModel,
} from '../mcp/normalize/types'

export type {
  ChartModel,
  ChartPoint,
  EventModel,
  KpiModel,
  MetricCell,
  TableModel,
} from '../mcp/normalize/types'

/** Supported visual blocks for any MCP tool output (known or unknown). */
export type ResultBlockKind = ResultBlock['kind']

export interface RankedListModel {
  columns: { key: string; label: string; align?: 'left' | 'right' }[]
  rows: Record<string, string | number | boolean | null>[]
  /** Column emphasized as rank / score (e.g. rank, score, #). */
  rankKey?: string
}

export interface MetricGroupModel {
  id: string
  title: string
  metrics: MetricCell[]
}

export interface FilterChip {
  id: string
  label: string
  value: string
}

export type ResultBlock =
  | { id: string; kind: 'table'; title?: string; table: TableModel }
  | { id: string; kind: 'series'; title?: string; chart: ChartModel }
  | { id: string; kind: 'kpis'; title?: string; kpis: KpiModel[] }
  | { id: string; kind: 'rankedList'; title?: string; ranked: RankedListModel }
  | { id: string; kind: 'metricGroups'; title?: string; groups: MetricGroupModel[] }
  | { id: string; kind: 'events'; title?: string; events: EventModel[] }
  | { id: string; kind: 'filters'; title?: string; filters: FilterChip[] }
  | { id: string; kind: 'json'; title?: string; raw: JsonValue }

/** Container for one tool invocation rendered in the workspace shell. */
export interface WorkspaceResults {
  toolName: string
  blocks: ResultBlock[]
  source?: JsonValue
}
