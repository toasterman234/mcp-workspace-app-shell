import type { JsonValue } from '../types'
import { asJsonObject } from '../../lib/json'
import type {
  ChartModel,
  EventModel,
  KpiModel,
  NormalizedToolResult,
  RenderHint,
  TableModel,
} from './types'

function pickHint(explicit: unknown, fallback: RenderHint): RenderHint {
  const s = typeof explicit === 'string' ? explicit : ''
  const allowed: RenderHint[] = [
    'table',
    'kpis',
    'chart',
    'metricsGrid',
    'filters',
    'timeline',
    'json',
    'auto',
  ]
  return (allowed.includes(s as RenderHint) ? (s as RenderHint) : fallback) ?? fallback
}

/**
 * Heuristic normalizer — never throws; unknown shapes fall back to `json` + raw.
 * Domain adapters can post-process for richer layouts.
 */
export function normalizeToolResult(
  toolName: string,
  structured: JsonValue | undefined,
  preferredHint?: string,
): NormalizedToolResult {
  const obj = asJsonObject(structured)
  const title =
    (obj?.title as string | undefined) ??
    (obj?.name as string | undefined) ??
    toolName

  if (obj?.view && asJsonObject(obj.view)) {
    const view = asJsonObject(obj.view)!
    const hint = pickHint(view.hint ?? preferredHint, 'auto')
    return {
      title,
      hint: hint === 'auto' ? 'json' : hint,
      table: asJsonObject(view.table) ? coerceTable(view.table) : undefined,
      kpis: Array.isArray(view.kpis) ? coerceKpis(view.kpis) : undefined,
      chart: asJsonObject(view.chart) ? coerceChart(view.chart) : undefined,
      metrics: Array.isArray(view.metrics) ? coerceMetrics(view.metrics) : undefined,
      filters: Array.isArray(view.filters) ? coerceFilters(view.filters) : undefined,
      events: Array.isArray(view.events) ? coerceEvents(view.events) : undefined,
      raw: structured,
    }
  }

  if (obj?.rows && Array.isArray(obj.rows)) {
    return {
      title,
      hint: 'table',
      table: coerceTable(obj),
      raw: structured,
    }
  }

  if (obj?.kpis && Array.isArray(obj.kpis)) {
    return {
      title,
      hint: 'kpis',
      kpis: coerceKpis(obj.kpis),
      raw: structured,
    }
  }

  if (obj?.series && Array.isArray(obj.series)) {
    return {
      title,
      hint: 'chart',
      chart: coerceChart(obj),
      raw: structured,
    }
  }

  if (obj?.events && Array.isArray(obj.events)) {
    return {
      title,
      hint: 'timeline',
      events: coerceEvents(obj.events),
      raw: structured,
    }
  }

  if (obj?.metrics && Array.isArray(obj.metrics)) {
    return {
      title,
      hint: 'metricsGrid',
      metrics: coerceMetrics(obj.metrics),
      raw: structured,
    }
  }

  if (obj?.filters && Array.isArray(obj.filters)) {
    return {
      title,
      hint: 'filters',
      filters: coerceFilters(obj.filters),
      raw: structured,
    }
  }

  return {
    title,
    hint: pickHint(preferredHint, 'json'),
    raw: structured,
  }
}

function coerceTable(input: unknown): TableModel | undefined {
  const o = asJsonObject(input)
  if (!o?.rows || !Array.isArray(o.rows)) return undefined
  const columnsRaw = Array.isArray(o.columns) ? o.columns : []
  const columns =
    columnsRaw.length > 0
      ? columnsRaw.map((c, i) => {
          if (typeof c === 'string') return { key: c, label: c }
          const co = asJsonObject(c)
          const key = String(co?.key ?? co?.field ?? `col_${i}`)
          const label = String(co?.label ?? co?.title ?? key)
          return { key, label }
        })
      : inferColumnsFromRows(o.rows as Record<string, unknown>[])

  const rows = (o.rows as unknown[]).map((r) => {
    const row = asJsonObject(r) ?? {}
    const out: Record<string, string | number | boolean | null> = {}
    for (const col of columns) {
      const v = row[col.key]
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
        out[col.key] = v
      } else if (v === undefined) {
        out[col.key] = ''
      } else {
        out[col.key] = JSON.stringify(v)
      }
    }
    return out
  })

  return { columns, rows }
}

function inferColumnsFromRows(rows: Record<string, unknown>[]) {
  const keys = new Set<string>()
  for (const r of rows.slice(0, 25)) {
    Object.keys(r ?? {}).forEach((k) => keys.add(k))
  }
  return [...keys].map((k) => ({ key: k, label: k }))
}

function coerceKpis(input: unknown): KpiModel[] | undefined {
  if (!Array.isArray(input)) return undefined
  return input.map((item, idx) => {
    const o = asJsonObject(item)
    return {
      label: String(o?.label ?? o?.name ?? `KPI ${idx + 1}`),
      value: String(o?.value ?? o?.val ?? ''),
      delta: o?.delta != null ? String(o.delta) : undefined,
      tone: (o?.tone as KpiModel['tone']) ?? 'neutral',
    }
  })
}

function coerceChart(input: unknown): ChartModel | undefined {
  const o = asJsonObject(input)
  if (!o?.series || !Array.isArray(o.series)) return undefined
  const series = o.series.map((s, i) => {
    const so = asJsonObject(s)
    const name = String(so?.name ?? `Series ${i + 1}`)
    const dataRaw = Array.isArray(so?.data) ? so?.data : []
    const data = dataRaw.map((p) => {
      const po = asJsonObject(p)
      const x = (po?.x ?? po?.t ?? po?.date ?? '') as string | number
      const y = Number(po?.y ?? po?.value ?? 0)
      return { x, y }
    })
    return { name, data }
  })
  return { series }
}

function coerceMetrics(input: unknown) {
  if (!Array.isArray(input)) return undefined
  return input.map((m, i) => {
    const o = asJsonObject(m)
    return {
      id: String(o?.id ?? `m_${i}`),
      label: String(o?.label ?? o?.name ?? `Metric ${i + 1}`),
      value: String(o?.value ?? ''),
      sublabel: o?.sublabel != null ? String(o.sublabel) : undefined,
    }
  })
}

function coerceFilters(input: unknown) {
  if (!Array.isArray(input)) return undefined
  return input.map((f, i) => {
    const o = asJsonObject(f)
    return {
      id: String(o?.id ?? `f_${i}`),
      label: String(o?.label ?? o?.name ?? `Filter ${i + 1}`),
      value: String(o?.value ?? ''),
    }
  })
}

function coerceEvents(input: unknown): EventModel[] | undefined {
  if (!Array.isArray(input)) return undefined
  return input.map((e, i) => {
    const o = asJsonObject(e)
    const level = (String(o?.level ?? 'info').toLowerCase() as EventModel['level']) || 'info'
    return {
      id: String(o?.id ?? `evt_${i}`),
      ts: String(o?.ts ?? o?.time ?? new Date().toISOString()),
      level: level === 'warn' || level === 'error' ? level : 'info',
      message: String(o?.message ?? o?.msg ?? ''),
      meta: (o?.meta as JsonValue) ?? undefined,
    }
  })
}
