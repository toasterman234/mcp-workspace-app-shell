import type { CanvasBlock, CanvasDocument } from '../canvas/types'
import { ChartRenderer } from './ChartRenderer'
import { EventTimeline } from './EventTimeline'
import { FilterPanel } from './FilterPanel'
import { JsonViewer } from './JsonViewer'
import { KpiCardsRenderer } from './KpiCardsRenderer'
import { MetricGroupsRenderer } from './MetricGroupsRenderer'
import { RankedListRenderer } from './RankedListRenderer'
import { TableRenderer } from './TableRenderer'
import { VegaLiteRenderer } from './VegaLiteRenderer'

function CanvasBlockRenderer({ block }: { block: CanvasBlock }) {
  return (
    <div className="generic-block">
      {'title' in block && block.title ? <h3 className="block-title">{block.title}</h3> : null}
      {block.kind === 'table' ? <TableRenderer table={block.table} /> : null}
      {block.kind === 'series' ? <ChartRenderer chart={block.chart} /> : null}
      {block.kind === 'kpis' ? <KpiCardsRenderer kpis={block.kpis} /> : null}
      {block.kind === 'rankedList' ? <RankedListRenderer ranked={block.ranked} /> : null}
      {block.kind === 'metricGroups' ? <MetricGroupsRenderer groups={block.groups} /> : null}
      {block.kind === 'events' ? <EventTimeline events={block.events} /> : null}
      {block.kind === 'filters' ? <FilterPanel filters={block.filters} /> : null}
      {block.kind === 'json' ? <JsonViewer value={block.raw} title="Structured payload" /> : null}
      {block.kind === 'vega_lite' ? <VegaLiteRenderer spec={block.spec} /> : null}
    </div>
  )
}

export function CanvasRenderer({ document }: { document: CanvasDocument }) {
  const blocks = document.blocks ?? []
  if (!blocks.length) return null
  return (
    <div className="tool-view">
      {blocks.map((block) => (
        <CanvasBlockRenderer key={block.id} block={block} />
      ))}
    </div>
  )
}

