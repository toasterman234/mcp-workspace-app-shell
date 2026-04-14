import type { JsonObject } from '../mcp/types'
import { asJsonObject } from '../lib/json'
import { normalizeToolResult } from '../mcp/normalize/normalizeToolResult'
import type { MetricCell } from '../mcp/normalize/types'
import type { KpiModel } from '../mcp/normalize/types'
import { resultBlocksFromNormalized } from '../results/fromNormalized'
import { nextBlockId } from '../results/blockId'
import type { MetricGroupModel, ResultBlock } from '../results/types'
import type { ToolAdapter } from './types'

function coerceMetricCells(input: unknown): MetricCell[] {
  if (!Array.isArray(input)) return []
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

function metricGroupsFromRaw(raw: JsonObject, title: string | undefined): ResultBlock[] {
  const groupsRaw = raw.groups
  if (!Array.isArray(groupsRaw) || !groupsRaw.length) return []
  const groups: MetricGroupModel[] = []
  for (let i = 0; i < groupsRaw.length; i++) {
    const g = asJsonObject(groupsRaw[i])
    if (!g) continue
    const metrics = coerceMetricCells(g.metrics)
    if (!metrics.length) continue
    groups.push({
      id: String(g.id ?? `grp_${i}`),
      title: String(g.title ?? `Group ${i + 1}`),
      metrics,
    })
  }
  if (!groups.length) return []
  return [{ id: nextBlockId('mg'), kind: 'metricGroups', title, groups }]
}

type OptionRow = {
  strike: number
  delta: number
  bid: number
  ask: number
  lastPrice: number
  volume: number
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function coerceOptionRows(input: unknown): OptionRow[] {
  if (!Array.isArray(input)) return []
  const out: OptionRow[] = []
  for (const entry of input) {
    const o = asJsonObject(entry)
    if (!o) continue
    const strike = toNumber(o.strike)
    const delta = toNumber(asJsonObject(o.greeks)?.delta)
    if (strike == null || delta == null) continue
    out.push({
      strike,
      delta,
      bid: toNumber(o.bid) ?? 0,
      ask: toNumber(o.ask) ?? 0,
      lastPrice: toNumber(o.lastPrice) ?? 0,
      volume: toNumber(o.volume) ?? 0,
    })
  }
  return out
}

function formatOptionContract(symbol: string | undefined, strike: number): string {
  const s = symbol?.trim() ? `${symbol.trim()} ` : ''
  return `${s}${strike}C`
}

function optionsChainSummaryBlocks(toolName: string, raw: JsonObject): ResultBlock[] {
  if (!/options[_-]?chain/i.test(toolName)) return []
  const calls = coerceOptionRows(raw.calls)
  if (!calls.length) return []

  const targetDelta = 0.2
  const nearestCalls = [...calls].sort(
    (a, b) => Math.abs(a.delta - targetDelta) - Math.abs(b.delta - targetDelta),
  )
  const pick = nearestCalls[0]
  if (!pick) return []

  const symbol = typeof raw.symbol === 'string' ? raw.symbol : undefined
  const expiration = typeof raw.expiration === 'string' ? raw.expiration : undefined
  const kpis: KpiModel[] = [
    {
      label: 'Selected call',
      value: formatOptionContract(symbol, pick.strike),
      delta: expiration ? `Exp ${expiration}` : undefined,
      tone: 'neutral',
    },
    {
      label: 'Delta',
      value: pick.delta.toFixed(4),
      delta: `Target ${targetDelta.toFixed(2)}`,
      tone: 'neutral',
    },
    {
      label: 'Bid / Ask',
      value: `${pick.bid.toFixed(2)} / ${pick.ask.toFixed(2)}`,
      delta: `Last ${pick.lastPrice.toFixed(2)}`,
      tone: 'neutral',
    },
    {
      label: 'Volume',
      value: pick.volume.toLocaleString('en-US'),
      tone: 'neutral',
    },
  ]

  const top = nearestCalls.slice(0, 5)
  return [
    {
      id: nextBlockId('kpis'),
      kind: 'kpis',
      title: `${symbol ?? 'Options'} 20-delta call snapshot`,
      kpis,
    },
    {
      id: nextBlockId('table'),
      kind: 'table',
      title: 'Closest calls to 0.20 delta',
      table: {
        columns: [
          { key: 'contract', label: 'Contract' },
          { key: 'delta', label: 'Delta' },
          { key: 'bid', label: 'Bid' },
          { key: 'ask', label: 'Ask' },
          { key: 'last', label: 'Last' },
          { key: 'volume', label: 'Volume' },
        ],
        rows: top.map((row) => ({
          contract: formatOptionContract(symbol, row.strike),
          delta: Number(row.delta.toFixed(4)),
          bid: Number(row.bid.toFixed(2)),
          ask: Number(row.ask.toFixed(2)),
          last: Number(row.lastPrice.toFixed(2)),
          volume: row.volume,
        })),
      },
    },
  ]
}

/**
 * Default adapter: slice common keys into normalized blocks, add metricGroups from `groups`,
 * then fall back to a single normalized JSON view.
 */
export const genericAdapter: ToolAdapter = (toolName, raw) => {
  const optionSummary = optionsChainSummaryBlocks(toolName, raw)
  if (optionSummary.length) return optionSummary

  if (asJsonObject(raw)?.view) {
    return resultBlocksFromNormalized(toolName, [normalizeToolResult(toolName, raw, 'auto')])
  }

  const out: ResultBlock[] = []
  const title = (typeof raw.title === 'string' ? raw.title : toolName) as string | undefined

  out.push(...metricGroupsFromRaw(raw, title))

  const pushNorm = (slice: JsonObject, hint: Parameters<typeof normalizeToolResult>[2]) => {
    const n = normalizeToolResult(toolName, slice, hint)
    out.push(...resultBlocksFromNormalized(toolName, [n]))
  }

  if (Array.isArray(raw.kpis)) pushNorm({ kpis: raw.kpis, title: raw.title }, 'kpis')
  if (Array.isArray(raw.series)) pushNorm({ series: raw.series, title: raw.title }, 'chart')
  if (Array.isArray(raw.filters)) pushNorm({ filters: raw.filters, title: raw.title }, 'filters')
  if (Array.isArray(raw.events)) pushNorm({ events: raw.events, title: raw.title }, 'timeline')
  if (Array.isArray(raw.rows))
    pushNorm({ rows: raw.rows, columns: raw.columns, title: raw.title }, 'table')
  if (Array.isArray(raw.metrics) && !raw.groups)
    pushNorm({ metrics: raw.metrics, title: raw.title }, 'metricsGrid')

  if (!out.length) {
    const n = normalizeToolResult(toolName, raw, 'auto')
    out.push(...resultBlocksFromNormalized(toolName, [n]))
  }

  return dedupeJsonTail(out)
}

/** If other blocks rendered payload, drop redundant standalone json blocks when possible. */
function dedupeJsonTail(blocks: ResultBlock[]): ResultBlock[] {
  const hasNonJson = blocks.some((b) => b.kind !== 'json')
  if (!hasNonJson) return blocks
  return blocks.filter((b) => !(b.kind === 'json' && blocks.length > 1))
}
