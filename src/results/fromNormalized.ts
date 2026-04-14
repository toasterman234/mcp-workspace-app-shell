/**
 * Bridge legacy NormalizedToolResult (hint-based) → discriminated ResultBlock.
 * Used by generic heuristics and incremental migration.
 */
import type { NormalizedToolResult } from '../mcp/normalize/types'
import { nextBlockId } from './blockId'
import type { ResultBlock } from './types'

export function resultBlocksFromNormalized(toolName: string, blocks: NormalizedToolResult[]): ResultBlock[] {
  return blocks.flatMap((b, i) => mapOne(toolName, b, i))
}

function mapOne(toolName: string, b: NormalizedToolResult, i: number): ResultBlock[] {
  const out: ResultBlock[] = []
  const title = b.title ?? toolName

  if (b.hint === 'json' || (!b.table && !b.kpis && !b.chart && !b.metrics && !b.events && !b.filters)) {
    out.push({ id: nextBlockId('json'), kind: 'json', title, raw: b.raw ?? {} })
    return out
  }

  if (b.kpis?.length) {
    out.push({ id: nextBlockId('kpis'), kind: 'kpis', title: i === 0 ? title : undefined, kpis: b.kpis })
  }
  if (b.chart) {
    out.push({ id: nextBlockId('series'), kind: 'series', title: i === 0 ? title : undefined, chart: b.chart })
  }
  if (b.metrics?.length) {
    out.push({
      id: nextBlockId('mg'),
      kind: 'metricGroups',
      title: i === 0 ? title : undefined,
      groups: [{ id: 'g0', title: 'Metrics', metrics: b.metrics }],
    })
  }
  if (b.filters?.length) {
    out.push({
      id: nextBlockId('filters'),
      kind: 'filters',
      title: i === 0 ? title : undefined,
      filters: b.filters.map((f) => ({ id: f.id, label: f.label, value: f.value })),
    })
  }
  if (b.table) {
    const rankKey =
      b.table.columns.find((c) => /^(rank|score|#|pos)$/i.test(c.key))?.key ??
      (b.table.rows[0] && 'rank' in b.table.rows[0] ? 'rank' : undefined)
    if (rankKey) {
      out.push({
        id: nextBlockId('ranked'),
        kind: 'rankedList',
        title: i === 0 ? title : undefined,
        ranked: { columns: b.table.columns, rows: b.table.rows, rankKey },
      })
    } else {
      out.push({ id: nextBlockId('table'), kind: 'table', title: i === 0 ? title : undefined, table: b.table })
    }
  }
  if (b.events?.length) {
    out.push({ id: nextBlockId('events'), kind: 'events', title: i === 0 ? title : undefined, events: b.events })
  }

  if (!out.length) {
    out.push({ id: nextBlockId('json'), kind: 'json', title, raw: b.raw ?? {} })
  }
  return out
}
